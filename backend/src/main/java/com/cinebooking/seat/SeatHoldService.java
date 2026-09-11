package com.cinebooking.seat;

import com.cinebooking.common.ApiException;
import com.cinebooking.booking.BookingSeatRepository;
import com.cinebooking.domain.SeatHoldRecord;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class SeatHoldService {
    public static final String AUTHORITY = "POSTGRESQL_WITH_REDIS_MIRROR";

    private final StringRedisTemplate redis;
    private final SeatHoldRepository repository;
    private final SeatRepository seats;
    private final BookingSeatRepository bookingSeats;
    private final SeatHoldAuditWriter audit;
    private final long ttlSeconds;
    private final Counter createdCounter;
    private final Counter refreshedCounter;
    private final Counter conflictCounter;
    private final Counter releasedCounter;
    private final Counter expiredCounter;
    private final Counter convertedCounter;
    private final Counter redisFailureCounter;

    public record AcquireResult(boolean acquired, UUID holdToken, long ttlSeconds, long serverEpochMs,
                                long holdExpiresAtEpochMs, List<UUID> seatIds, String authority) {}
    public record ReconcileResult(int expiredRows, int activeRows, int mirroredRows, boolean redisAvailable) {}

    public SeatHoldService(StringRedisTemplate redis, SeatHoldRepository repository, SeatRepository seats,
                           BookingSeatRepository bookingSeats, SeatHoldAuditWriter audit, MeterRegistry registry,
                           @Value("${app.seat-hold.ttl-seconds}") long ttlSeconds) {
        this.redis=redis;this.repository=repository;this.seats=seats;this.bookingSeats=bookingSeats;this.audit=audit;
        if(ttlSeconds<30 || ttlSeconds>1800) throw new IllegalArgumentException("app.seat-hold.ttl-seconds must be 30-1800");
        this.ttlSeconds=ttlSeconds;
        this.createdCounter=Counter.builder("cinebooking.seat.hold.created").register(registry);
        this.refreshedCounter=Counter.builder("cinebooking.seat.hold.refreshed").register(registry);
        this.conflictCounter=Counter.builder("cinebooking.seat.hold.conflicts").register(registry);
        this.releasedCounter=Counter.builder("cinebooking.seat.hold.released").register(registry);
        this.expiredCounter=Counter.builder("cinebooking.seat.hold.expired").register(registry);
        this.convertedCounter=Counter.builder("cinebooking.seat.hold.converted").register(registry);
        this.redisFailureCounter=Counter.builder("cinebooking.seat.hold.redis.failures").register(registry);
    }

    /**
     * V66 durable acquire. Seat rows are locked in deterministic UUID order, so concurrent requests
     * hitting different backend replicas serialize in PostgreSQL before active hold ownership changes.
     */
    @Transactional
    public AcquireResult acquire(UUID showtimeId, List<UUID> seatIds, UUID userId) {
        List<UUID> ids=normalize(seatIds);
        lockSeatRows(ids);
        Instant now=Instant.now();
        repository.expireRequested(showtimeId,ids,now);
        Set<UUID> booked=new HashSet<>(bookingSeats.findReservedSeatIds(showtimeId));
        List<UUID> alreadyBooked=ids.stream().filter(booked::contains).toList();
        if(!alreadyBooked.isEmpty()){
            conflictCounter.increment();
            safeAuditUser(userId,"SEAT_HOLD_CONFLICT",showtimeId.toString(),"showtime="+showtimeId+" bookedSeats="+alreadyBooked.size()+" dbInvariant=uq_showtime_seat_active");
            throw new ApiException(org.springframework.http.HttpStatus.CONFLICT,"Có ghế đã được đặt bởi giao dịch khác");
        }
        List<SeatHoldRecord> active=repository.findActiveForSeats(showtimeId,ids,now);
        List<SeatHoldRecord> foreign=active.stream().filter(x->!userId.equals(x.getUserId())).toList();
        if(!foreign.isEmpty()){
            conflictCounter.increment();
            UUID token=foreign.get(0).getHoldToken();
            safeAuditUser(userId,"SEAT_HOLD_CONFLICT",token.toString(),
                    "showtime="+showtimeId+" seats="+ids.size()+" conflictSeats="+foreign.size());
            throw new ApiException(org.springframework.http.HttpStatus.CONFLICT,"Có ghế đang được người khác giữ");
        }

        Map<UUID,SeatHoldRecord> existing=new HashMap<>();
        active.forEach(x->existing.put(x.getSeatId(),x));
        boolean refreshOnly=existing.size()==ids.size();
        UUID token=refreshOnly && !active.isEmpty() ? active.get(0).getHoldToken() : UUID.randomUUID();
        Instant expiresAt=now.plusSeconds(ttlSeconds);
        List<SeatHoldRecord> saved=new ArrayList<>();
        for(UUID seatId:ids){
            SeatHoldRecord row=existing.get(seatId);
            if(row==null){
                row=new SeatHoldRecord();
                row.setShowtimeId(showtimeId);row.setSeatId(seatId);row.setUserId(userId);row.setCreatedAt(now);
                row.setLastEvent("SEAT_HOLD_CREATED");
            }else{
                row.setLastEvent("SEAT_HOLD_REFRESHED");
            }
            row.setHoldToken(token);row.setState("HELD");row.setRefreshedAt(now);row.setExpiresAt(expiresAt);
            row.setReleasedAt(null);row.setConvertedBookingId(null);
            saved.add(repository.save(row));
        }
        try{repository.flush();}
        catch(DataIntegrityViolationException ex){
            conflictCounter.increment();
            safeAuditUser(userId,"SEAT_HOLD_CONFLICT",token.toString(),"showtime="+showtimeId+" seats="+ids.size()+" dbInvariant=uq_seat_hold_active");
            throw new ApiException(org.springframework.http.HttpStatus.CONFLICT,"Ghế vừa được người khác giữ trước. Hãy chọn ghế khác.");
        }

        afterCommit(()->{
            mirror(showtimeId,saved);
            if(refreshOnly){
                refreshedCounter.increment();
                safeAuditUser(userId,"SEAT_HOLD_REFRESHED",token.toString(),"showtime="+showtimeId+" seats="+ids.size()+" expiresAt="+expiresAt);
            }else{
                createdCounter.increment();
                safeAuditUser(userId,"SEAT_HOLD_CREATED",token.toString(),"showtime="+showtimeId+" seats="+ids.size()+" expiresAt="+expiresAt);
            }
        });
        return new AcquireResult(true,token,ttlSeconds,now.toEpochMilli(),expiresAt.toEpochMilli(),ids,AUTHORITY);
    }

    /**
     * Checkout gate. The seat-row locks join BookingService.create's transaction and stay held until
     * the booking transaction commits/rolls back, preventing expiry/reacquire from racing checkout.
     */
    @Transactional
    public boolean ownsAll(UUID showtimeId, List<UUID> seatIds, UUID userId) {
        List<UUID> ids=normalize(seatIds);
        lockSeatRows(ids);
        Instant now=Instant.now();
        repository.expireRequested(showtimeId,ids,now);
        List<SeatHoldRecord> active=repository.findActiveForSeats(showtimeId,ids,now);
        boolean owned=active.size()==ids.size() && active.stream().allMatch(x->userId.equals(x.getUserId()));
        if(owned) afterCommit(()->mirror(showtimeId,active));
        return owned;
    }

    @Transactional
    public List<String> holders(UUID showtimeId, List<UUID> seatIds) {
        if(seatIds==null||seatIds.isEmpty()) return List.of();
        List<UUID> ids=seatIds.stream().filter(Objects::nonNull).distinct().toList();
        Instant now=Instant.now();
        // Read paths never transition state: expiry writes are serialized by seat-row locks in acquire/checkout/job.
        List<SeatHoldRecord> active=repository.findActiveForSeats(showtimeId,ids,now);
        Map<UUID,SeatHoldRecord> bySeat=new HashMap<>(); active.forEach(x->bySeat.put(x.getSeatId(),x));
        afterCommit(()->mirror(showtimeId,active));
        List<String> result=new ArrayList<>();
        for(UUID id:ids){SeatHoldRecord row=bySeat.get(id);result.add(row==null?null:row.getUserId().toString());}
        return result;
    }

    @Transactional
    public long remainingMillis(UUID showtimeId, List<UUID> seatIds, UUID userId) {
        if(userId==null||seatIds==null||seatIds.isEmpty()) return 0;
        List<UUID> ids=seatIds.stream().filter(Objects::nonNull).distinct().toList();
        Instant now=Instant.now();
        return repository.findActiveForSeats(showtimeId,ids,now).stream()
                .filter(x->userId.equals(x.getUserId()))
                .map(SeatHoldRecord::getExpiresAt)
                .mapToLong(x->Math.max(0,Duration.between(now,x).toMillis()))
                .min().orElse(0L);
    }

    @Transactional
    public long remainingSeconds(UUID showtimeId,List<UUID> seatIds,UUID userId){
        long ms=remainingMillis(showtimeId,seatIds,userId);
        return ms<=0?0:(ms+999)/1000;
    }

    @Transactional
    public void release(UUID showtimeId, List<UUID> seatIds, UUID userId) {
        List<UUID> ids=normalize(seatIds);
        lockSeatRows(ids);
        Instant now=Instant.now();
        repository.expireRequested(showtimeId,ids,now);
        List<SeatHoldRecord> active=repository.findActiveForSeats(showtimeId,ids,now);
        List<SeatHoldRecord> mine=active.stream().filter(x->userId.equals(x.getUserId())).toList();
        for(SeatHoldRecord row:mine){row.setState("RELEASED");row.setReleasedAt(now);row.setLastEvent("SEAT_HOLD_RELEASED");repository.save(row);}
        repository.flush();
        if(!mine.isEmpty()) afterCommit(()->{
            clearMirror(showtimeId,mine.stream().map(SeatHoldRecord::getSeatId).toList());
            releasedCounter.increment(mine.size());
            safeAuditUser(userId,"SEAT_HOLD_RELEASED",mine.get(0).getHoldToken().toString(),"showtime="+showtimeId+" seats="+mine.size());
        });
    }

    @Transactional
    public void convertToBooking(UUID showtimeId,List<UUID> seatIds,UUID userId,UUID bookingId){
        List<UUID> ids=normalize(seatIds);
        // Seat rows are normally already locked by ownsAll() in the outer booking transaction.
        lockSeatRows(ids);
        List<SeatHoldRecord> active=repository.findActiveForSeats(showtimeId,ids,Instant.EPOCH);
        Map<UUID,SeatHoldRecord> bySeat=new HashMap<>();
        active.stream().filter(x->"HELD".equals(x.getState())).forEach(x->bySeat.put(x.getSeatId(),x));
        for(UUID id:ids){
            SeatHoldRecord row=bySeat.get(id);
            if(row==null || !userId.equals(row.getUserId()))
                throw new ApiException(org.springframework.http.HttpStatus.CONFLICT,"Quyền giữ ghế không còn hợp lệ. Hãy chọn ghế lại.");
        }
        Instant now=Instant.now();
        List<SeatHoldRecord> converted=new ArrayList<>();
        for(UUID id:ids){
            SeatHoldRecord row=bySeat.get(id);row.setState("CONVERTED");row.setReleasedAt(now);row.setConvertedBookingId(bookingId);row.setLastEvent("SEAT_HOLD_CONVERTED");converted.add(repository.save(row));
        }
        repository.flush();
        afterCommit(()->{
            clearMirror(showtimeId,ids);convertedCounter.increment(converted.size());
            safeAuditUser(userId,"SEAT_HOLD_CONVERTED",converted.get(0).getHoldToken().toString(),"showtime="+showtimeId+" booking="+bookingId+" seats="+ids.size());
        });
    }

    @Transactional
    public List<SeatHoldRecord> expireBatch(int limit){
        Instant now=Instant.now();
        List<SeatHoldRecord> candidates=repository.findTop200ByStateAndExpiresAtBeforeOrderByExpiresAtAsc("HELD",now);
        if(candidates.size()>Math.max(1,limit)) candidates=candidates.subList(0,Math.max(1,limit));
        List<SeatHoldRecord> expired=new ArrayList<>();
        for(SeatHoldRecord row:candidates){
            lockSeatRows(List.of(row.getSeatId()));
            if(repository.expireOne(row.getId(),now)==1){
                row.setState("EXPIRED");row.setReleasedAt(now);row.setLastEvent("SEAT_HOLD_EXPIRED");expired.add(row);
            }
        }
        if(!expired.isEmpty()) afterCommit(()->{
            Map<UUID,List<SeatHoldRecord>> groups=new HashMap<>();
            for(SeatHoldRecord x:expired)groups.computeIfAbsent(x.getShowtimeId(),k->new ArrayList<>()).add(x);
            groups.forEach((showtime,rows)->clearMirror(showtime,rows.stream().map(SeatHoldRecord::getSeatId).toList()));
            expiredCounter.increment(expired.size());
            for(SeatHoldRecord row:expired) safeAuditSystem("SEAT_HOLD_EXPIRED",row.getHoldToken().toString(),"showtime="+row.getShowtimeId()+" seat="+row.getSeatId());
        });
        return expired;
    }

    @Transactional
    public ReconcileResult reconcile(){
        int expired=0;
        for(int pass=0;pass<10;pass++){
            List<SeatHoldRecord> batch=expireBatch(200);
            expired+=batch.size();
            if(batch.size()<200)break;
        }
        Instant now=Instant.now();
        List<SeatHoldRecord> active=repository.findAllActive(now);
        boolean redisOk=redisAvailable();
        int mirrored=0;
        if(redisOk){
            for(SeatHoldRecord row:active){if(mirrorOne(row.getShowtimeId(),row))mirrored++;}
        }
        return new ReconcileResult(expired,active.size(),mirrored,redisOk);
    }

    public boolean redisAvailable(){
        if(redis.getConnectionFactory()==null)return false;
        try(org.springframework.data.redis.connection.RedisConnection connection=redis.getConnectionFactory().getConnection()){
            return "PONG".equalsIgnoreCase(connection.ping());
        }catch(Exception ex){redisFailureCounter.increment();return false;}
    }

    public long ttlSeconds(){return ttlSeconds;}

    private List<UUID> normalize(List<UUID> seatIds){
        List<UUID> ids=seatIds==null?List.of():seatIds.stream().filter(Objects::nonNull).distinct().sorted().toList();
        if(ids.isEmpty()) throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST,"Hãy chọn ít nhất một ghế");
        return ids;
    }

    private void lockSeatRows(List<UUID> ids){
        if(seats.findByIdInForUpdate(ids).size()!=ids.size()) throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST,"Ghế không hợp lệ");
    }

    private String key(UUID showtimeId,UUID seatId){return "hold:"+showtimeId+":"+seatId;}
    private String value(SeatHoldRecord row){return row.getUserId()+"|"+row.getHoldToken();}

    private void mirror(UUID showtimeId,List<SeatHoldRecord> rows){for(SeatHoldRecord row:rows)mirrorOne(showtimeId,row);}
    private boolean mirrorOne(UUID showtimeId,SeatHoldRecord row){
        long ms=Math.max(1,Duration.between(Instant.now(),row.getExpiresAt()).toMillis());
        if(ms<=1)return false;
        try{redis.opsForValue().set(key(showtimeId,row.getSeatId()),value(row),Duration.ofMillis(ms));return true;}
        catch(Exception ex){redisFailureCounter.increment();return false;}
    }
    private void clearMirror(UUID showtimeId,List<UUID> seatIds){
        try{List<String> keys=seatIds.stream().distinct().map(x->key(showtimeId,x)).toList();if(!keys.isEmpty())redis.delete(keys);}
        catch(Exception ex){redisFailureCounter.increment();}
    }

    private void afterCommit(Runnable action){
        if(TransactionSynchronizationManager.isSynchronizationActive()){
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCommit(){action.run();}});
        }else action.run();
    }
    private void safeAuditUser(UUID userId,String action,String entityId,String details){try{audit.userEvent(userId,action,entityId,details);}catch(Exception ignored){}}
    private void safeAuditSystem(String action,String entityId,String details){try{audit.systemEvent(action,entityId,details);}catch(Exception ignored){}}
}
