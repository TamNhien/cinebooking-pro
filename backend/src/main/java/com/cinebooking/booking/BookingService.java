package com.cinebooking.booking;

import com.cinebooking.commerce.*;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.MovieRepository;
import com.cinebooking.movie.ShowtimeRepository;
import com.cinebooking.movie.AuditoriumRepository;
import com.cinebooking.notification.NotificationService;
import com.cinebooking.pricing.PricingService;
import com.cinebooking.seat.SeatHoldService;
import com.cinebooking.seat.SeatRepository;
import com.cinebooking.user.UserRepository;
import com.cinebooking.websocket.SeatEventPublisher;
import com.cinebooking.websocket.OperationsSignalPublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.*;

import static com.cinebooking.booking.BookingDtos.*;

@Service
public class BookingService {
    private static final BigDecimal POINT_VALUE = BigDecimal.valueOf(100); // 1 point = 100đ
    private final BookingRepository bookings;
    private final BookingSeatRepository bookingSeats;
    private final ShowtimeRepository showtimes;
    private final AuditoriumRepository auditoriums;
    private final SeatRepository seats;
    private final MovieRepository movies;
    private final UserRepository users;
    private final SeatHoldService holds;
    private final SeatEventPublisher events;
    private final OperationsSignalPublisher operationsSignals;
    private final CommerceService commerce;
    private final InventoryService inventory;
    private final LoyaltyService loyalty;
    private final NotificationService notifications;
    private final PricingService pricing;
    private final long paymentWindowSeconds;
    private final int showtimeReminderHours;
    private final int showtimeFinalReminderMinutes;

    public BookingService(BookingRepository bookings, BookingSeatRepository bookingSeats, ShowtimeRepository showtimes, AuditoriumRepository auditoriums,
                          SeatRepository seats, MovieRepository movies, UserRepository users,
                          SeatHoldService holds, SeatEventPublisher events, OperationsSignalPublisher operationsSignals, CommerceService commerce, InventoryService inventory,
                          LoyaltyService loyalty, NotificationService notifications, PricingService pricing,
                          @Value("${app.booking.payment-window-seconds}") long paymentWindowSeconds,
                          @Value("${app.notifications.showtime-reminder-hours:3}") int showtimeReminderHours,
                          @Value("${app.notifications.showtime-final-reminder-minutes:30}") int showtimeFinalReminderMinutes) {
        this.bookings=bookings; this.bookingSeats=bookingSeats; this.showtimes=showtimes; this.auditoriums=auditoriums; this.seats=seats;
        this.movies=movies; this.users=users; this.holds=holds; this.events=events; this.operationsSignals=operationsSignals; this.commerce=commerce; this.inventory=inventory;
        this.loyalty=loyalty; this.notifications=notifications; this.pricing=pricing; this.paymentWindowSeconds=paymentWindowSeconds;
        this.showtimeReminderHours=Math.max(1,showtimeReminderHours); this.showtimeFinalReminderMinutes=Math.max(5,showtimeFinalReminderMinutes);
    }

    public record BookingCreateResult(BookingResponse booking, boolean replayed) {}

    @Transactional
    public BookingCreateResult create(CreateBookingRequest req, String email, String idempotencyKeyRaw) {
        AppUser baseUser = users.findByEmailIgnoreCase(email).orElseThrow();
        // Serialize checkout attempts for one user. This makes a duplicate Idempotency-Key
        // deterministic even when the two requests land on different backend containers.
        AppUser user = users.findByIdForUpdate(baseUser.getId()).orElseThrow();

        String idempotencyKey = normalizeIdempotencyKey(idempotencyKeyRaw);
        String fingerprint = idempotencyKey == null ? null : requestFingerprint(req);
        if (idempotencyKey != null) {
            Booking replay = bookings.findByUserIdAndIdempotencyKey(user.getId(), idempotencyKey).orElse(null);
            if (replay != null) {
                if (!Objects.equals(replay.getRequestFingerprint(), fingerprint)) {
                    throw new ApiException(HttpStatus.CONFLICT,
                            "Idempotency-Key này đã được dùng cho một nội dung đặt vé khác. Hãy tạo yêu cầu thanh toán mới.");
                }
                return new BookingCreateResult(toDto(replay), true);
            }
        }

        Showtime showtime = showtimes.findById(req.showtimeId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy suất chiếu"));
        if (showtime.getStatus() != ShowtimeStatus.OPEN || showtime.getStartTime().isBefore(Instant.now()))
            throw new ApiException(HttpStatus.CONFLICT,"Suất chiếu không còn mở đặt vé");

        repairSeatReservations(showtime.getId());
        Booking existingPending=bookings.findFirstByUserIdAndShowtimeIdAndStatusOrderByCreatedAtDesc(user.getId(),showtime.getId(),BookingStatus.PENDING).orElse(null);
        if(existingPending!=null)
            throw new ApiException(HttpStatus.CONFLICT,"Bạn đang có đơn chờ thanh toán cho suất chiếu này. Hãy tiếp tục thanh toán hoặc huỷ đơn cũ trước khi đặt ghế mới.");

        List<UUID> seatIds = req.seatIds().stream().distinct().toList();
        if (!holds.ownsAll(showtime.getId(), seatIds, user.getId()))
            throw new ApiException(HttpStatus.CONFLICT,"Bạn chưa giữ đủ ghế hoặc thời gian giữ ghế đã hết");

        // Redis protects the short hold window, while PostgreSQL remains the final authority.
        // The explicit pre-check gives a friendly response in the common case; the unique index
        // still protects the race between this check and the INSERT below.
        Set<UUID> alreadyReserved = new HashSet<>(bookingSeats.findReservedSeatIds(showtime.getId()));
        List<UUID> blocked = seatIds.stream().filter(alreadyReserved::contains).toList();
        if(!blocked.isEmpty())
            throw new ApiException(HttpStatus.CONFLICT,"Ghế vừa được đặt bởi giao dịch khác. Hãy làm mới sơ đồ và chọn ghế khác.");

        List<Seat> selected = seats.findByIdIn(seatIds);
        if (selected.size() != seatIds.size() || selected.stream().anyMatch(s -> !s.getAuditoriumId().equals(showtime.getAuditoriumId())))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Ghế không hợp lệ");

        Map<UUID,Seat> seatById = new HashMap<>(); selected.forEach(s -> seatById.put(s.getId(),s));
        PricingService.PricingContext pricingContext=pricing.contextFor(showtime);
        Map<UUID,PricingService.PriceQuote> seatQuotes=new HashMap<>();
        BigDecimal seatTotal=BigDecimal.ZERO;
        for(UUID seatId:seatIds){
            PricingService.PriceQuote quote=pricing.quote(pricingContext,seatById.get(seatId));
            seatQuotes.put(seatId,quote);
            seatTotal=seatTotal.add(quote.finalPrice());
        }

        Instant bookingCreatedAt = Instant.now();
        Booking b = new Booking();
        b.setUserId(user.getId()); b.setPurchaserUserId(user.getId()); b.setShowtimeId(showtime.getId()); b.setStatus(BookingStatus.PENDING);
        b.setSeatAmount(seatTotal); b.setConcessionAmount(BigDecimal.ZERO); b.setDiscountAmount(BigDecimal.ZERO);
        b.setPointsRedeemed(0); b.setBenefitsRefunded(false); b.setTotalAmount(seatTotal);
        b.setIdempotencyKey(idempotencyKey); b.setRequestFingerprint(fingerprint);
        b.setCreatedAt(bookingCreatedAt);
        b.setExpiresAt(bookingCreatedAt.plusSeconds(paymentWindowSeconds));
        bookings.saveAndFlush(b);

        List<CommerceService.Selection> selectionReq = req.concessions()==null?List.of():req.concessions().stream()
                .map(x->new CommerceService.Selection(x.productId(),x.quantity())).toList();
        UUID cinemaId=auditoriums.findById(showtime.getAuditoriumId()).orElseThrow(()->new ApiException(HttpStatus.CONFLICT,"Không tìm thấy rạp của suất chiếu")).getCinemaId();
        List<BookingConcession> concessionRows = commerce.buildConcessions(b.getId(),cinemaId,selectionReq);
        BigDecimal concessionTotal = commerce.total(concessionRows);
        commerce.saveConcessions(concessionRows);
        inventory.reserveForBooking(b.getId(),cinemaId,concessionRows);
        BigDecimal gross = seatTotal.add(concessionTotal);

        CommerceService.AppliedVoucher voucher = commerce.applyVoucher(req.voucherCode(),gross,user.getId(),b.getId());
        BigDecimal afterVoucher = gross.subtract(voucher.discount()).max(BigDecimal.ZERO);

        int requestedPoints = req.redeemPoints()==null?0:req.redeemPoints();
        int availablePoints = loyalty.refreshAvailablePoints(user);
        int maxByOrder = afterVoucher.multiply(BigDecimal.valueOf(0.30)).divide(POINT_VALUE,0,RoundingMode.DOWN).intValue();
        int maxPoints = Math.min(availablePoints,maxByOrder);
        if(requestedPoints>maxPoints) throw new ApiException(HttpStatus.CONFLICT,"Bạn chỉ có thể dùng tối đa "+maxPoints+" điểm cho đơn hàng này");
        BigDecimal pointsDiscount = POINT_VALUE.multiply(BigDecimal.valueOf(requestedPoints));
        if(requestedPoints>0) loyalty.redeemForBooking(user,b.getId(),requestedPoints);

        BigDecimal discountTotal = voucher.discount().add(pointsDiscount);
        BigDecimal finalTotal = gross.subtract(discountTotal).max(BigDecimal.ZERO);
        b.setConcessionAmount(concessionTotal); b.setDiscountAmount(discountTotal); b.setPointsRedeemed(requestedPoints);
        b.setVoucherCode(voucher.code()); b.setTotalAmount(finalTotal); bookings.save(b);

        for (UUID seatId : seatIds) {
            BookingSeat bs = new BookingSeat(); bs.setBookingId(b.getId()); bs.setShowtimeId(showtime.getId()); bs.setSeatId(seatId);
            bs.setPrice(seatQuotes.get(seatId).finalPrice()); bookingSeats.save(bs);
        }
        try {
            bookingSeats.flush();
        } catch (DataIntegrityViolationException ex) {
            // If two different users somehow pass the Redis/pre-check window together, the
            // partial unique index is the last line of defense. Translate that race to 409
            // instead of leaking a database 500 to the customer.
            String root = rootCauseMessage(ex);
            if (root.contains("uq_showtime_seat_active")) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Ghế vừa được giao dịch khác xác nhận trước. Đơn hiện tại đã được rollback; hãy chọn ghế khác.");
            }
            throw ex;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                holds.release(showtime.getId(), seatIds, user.getId());
                events.publish(showtime.getId(),"BOOKED_PENDING",seatIds);
            }
        });
        operationsSignals.publish("BOOKING:CREATED");
        return new BookingCreateResult(toDto(b), false);
    }

    public List<BookingResponse> mine(String email) { UUID userId=users.findByEmailIgnoreCase(email).orElseThrow().getId(); return bookings.findByUserIdOrderByCreatedAtDesc(userId).stream().map(this::toDto).toList(); }
    public BookingResponse getOwned(UUID bookingId,String email){Booking b=bookings.findById(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));UUID userId=users.findByEmailIgnoreCase(email).orElseThrow().getId();if(!b.getUserId().equals(userId))throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền xem booking này");return toDto(b);}

    @Transactional
    public BookingResponse pendingForShowtime(String email, UUID showtimeId) {
        UUID userId=users.findByEmailIgnoreCase(email).orElseThrow().getId();
        repairSeatReservations(showtimeId);
        return bookings.findFirstByUserIdAndShowtimeIdAndStatusOrderByCreatedAtDesc(userId,showtimeId,BookingStatus.PENDING)
                .map(this::toDto).orElse(null);
    }

    @Transactional
    public BookingResponse cancelOwnedPending(UUID bookingId,String email) {
        UUID userId=users.findByEmailIgnoreCase(email).orElseThrow().getId();
        Booking b=bookings.findByIdForUpdate(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));
        if(!b.getUserId().equals(userId)) throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền huỷ booking này");
        if(b.getStatus()!=BookingStatus.PENDING) throw new ApiException(HttpStatus.CONFLICT,"Chỉ có thể huỷ đơn đang chờ thanh toán");
        cancelPending(bookingId,BookingStatus.CANCELLED);
        return toDto(bookings.findById(bookingId).orElseThrow());
    }

    @Transactional
    public void expireStalePendingForShowtime(UUID showtimeId) {
        Instant now=Instant.now();
        for(Booking stale:bookings.findByShowtimeIdAndStatusAndExpiresAtBefore(showtimeId,BookingStatus.PENDING,now)) {
            cancelPending(stale.getId(),BookingStatus.EXPIRED);
        }
    }

    /**
     * V16 repairs legacy/inconsistent booking_seat rows before the seat map or booking flow uses them.
     * This keeps the UI availability query aligned with uq_showtime_seat_active in PostgreSQL.
     */
    @Transactional
    public int repairSeatReservations(UUID showtimeId) {
        expireStalePendingForShowtime(showtimeId);
        return bookingSeats.releaseInactiveRowsForShowtime(showtimeId);
    }

    @Transactional
    public Booking confirm(UUID bookingId) {
        Booking b = bookings.findByIdForUpdate(bookingId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));
        if (b.getStatus() == BookingStatus.CONFIRMED) return b;
        if (b.getStatus() != BookingStatus.PENDING || (b.getExpiresAt()!=null && b.getExpiresAt().isBefore(Instant.now())))
            throw new ApiException(HttpStatus.CONFLICT,"Booking không còn hiệu lực");
        b.setStatus(BookingStatus.CONFIRMED); b.setConfirmedAt(Instant.now()); Booking saved=bookings.save(b); operationsSignals.publish("BOOKING:CONFIRMED"); return saved;
    }

    @Transactional
    public void cancelPending(UUID bookingId, BookingStatus finalStatus) {
        Booking b = bookings.findByIdForUpdate(bookingId).orElse(null);
        if (b == null || b.getStatus() != BookingStatus.PENDING) return;
        List<BookingSeat> rows = bookingSeats.findByBookingId(bookingId); List<UUID> seatIds=rows.stream().map(BookingSeat::getSeatId).toList();
        refundBenefitsIfNeeded(b);
        inventory.releaseReservation(bookingId, finalStatus==BookingStatus.EXPIRED?"Booking hết hạn - trả tồn kho đã giữ":"Booking bị huỷ - trả tồn kho đã giữ");
        bookingSeats.releaseByBookingId(bookingId);
        b.setStatus(finalStatus); bookings.save(b); operationsSignals.publish("BOOKING:"+finalStatus.name());
        notifications.create(b.getUserId(),finalStatus==BookingStatus.EXPIRED?"BOOKING_EXPIRED":"BOOKING_CANCELLED",finalStatus==BookingStatus.EXPIRED?"Đơn đặt vé đã hết hạn":"Đơn đặt vé đã được huỷ","Booking "+b.getId()+" không còn hiệu lực. Điểm/voucher đã dùng (nếu có) được hoàn lại.","/bookings");
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCommit(){events.publish(b.getShowtimeId(),finalStatus.name(),seatIds);}});
    }

    private void refundBenefitsIfNeeded(Booking b){
        if(Boolean.TRUE.equals(b.getBenefitsRefunded()))return;
        int points=b.getPointsRedeemed()==null?0:b.getPointsRedeemed();
        if(points>0) loyalty.refundRedeemedPoints(b.getUserId(),b.getId(),points,"Hoàn điểm do booking bị huỷ/hết hạn");
        commerce.releaseVoucher(b.getId()); b.setBenefitsRefunded(true);
    }

    @Transactional
    public void sendReminderIfDue(UUID bookingId){
        sendEngagementRemindersIfDue(bookingId);
    }

    @Transactional
    public void sendEngagementRemindersIfDue(UUID bookingId){
        Booking b=bookings.findByIdForUpdate(bookingId).orElse(null);
        if(b==null||b.getStatus()!=BookingStatus.CONFIRMED||b.getCheckedInAt()!=null)return;
        Showtime st=showtimes.findById(b.getShowtimeId()).orElse(null); if(st==null)return;
        Instant now=Instant.now(); if(!st.getStartTime().isAfter(now))return;
        long seconds=st.getStartTime().getEpochSecond()-now.getEpochSecond();
        Movie m=movies.findById(st.getMovieId()).orElse(null); String movie=m==null?"Phim":m.getTitle();
        if(seconds<=showtimeFinalReminderMinutes*60L){
            notifications.createOnce(b.getUserId(),"SHOWTIME_REMINDER_30M","Sắp đến giờ vào rạp",movie+" sẽ bắt đầu trong vòng "+showtimeFinalReminderMinutes+" phút. Hãy mở QR vé và đến khu vực check-in.","/ticket/"+b.getId(),"SHOWTIME_REMINDER_30M:"+b.getId());
            if(!Boolean.TRUE.equals(b.getReminderSent())){b.setReminderSent(true);bookings.save(b);}
        }else if(seconds<=showtimeReminderHours*3600L){
            notifications.createOnce(b.getUserId(),"SHOWTIME_REMINDER_3H","Sắp đến giờ chiếu",movie+" sẽ bắt đầu trong vòng "+showtimeReminderHours+" giờ. Hãy kiểm tra rạp, ghế và QR vé trước khi đi.","/ticket/"+b.getId(),"SHOWTIME_REMINDER_3H:"+b.getId());
        }
    }

    @Transactional public BookingResponse adminCancel(UUID bookingId){Booking b=bookings.findByIdForUpdate(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));if(b.getStatus()==BookingStatus.CONFIRMED)throw new ApiException(HttpStatus.CONFLICT,"Booking đã thanh toán; cần quy trình hoàn tiền thay vì huỷ trực tiếp");if(b.getStatus()==BookingStatus.PENDING)cancelPending(bookingId,BookingStatus.CANCELLED);return toDto(bookings.findById(bookingId).orElseThrow());}
    @Transactional public void adminDelete(UUID bookingId){bookings.findById(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));throw new ApiException(HttpStatus.CONFLICT,"V13 không cho xoá cứng booking. Hãy dùng trạng thái huỷ/hoàn tiền để giữ lịch sử đối soát.");}
    public Booking entity(UUID id){return bookings.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));}

    public BookingResponse toDto(Booking b) {
        Showtime st=showtimes.findById(b.getShowtimeId()).orElseThrow(); Movie movie=movies.findById(st.getMovieId()).orElseThrow(); Map<UUID,Seat> seatMap=new HashMap<>();
        List<BookingSeat> seatRows=bookingSeats.findByBookingId(b.getId()); seats.findAllById(seatRows.stream().map(BookingSeat::getSeatId).toList()).forEach(s->seatMap.put(s.getId(),s));
        List<BookingSeatResponse> seatDtos=seatRows.stream().map(bs->{Seat s=seatMap.get(bs.getSeatId());return new BookingSeatResponse(bs.getSeatId(),s==null?"?":s.getRowLabel()+s.getSeatNumber(),bs.getPrice());}).toList();
        List<BookingConcessionResponse> con=commerce.bookingItems(b.getId()).stream().map(x->new BookingConcessionResponse(x.getProductId(),x.getProductName(),x.getUnitPrice(),x.getQuantity(),x.getSubtotal())).toList();
        return new BookingResponse(b.getId(),b.getShowtimeId(),movie.getTitle(),st.getStartTime(),b.getStatus().name(),b.getTotalAmount(),nz(b.getSeatAmount()),nz(b.getConcessionAmount()),nz(b.getDiscountAmount()),b.getPointsRedeemed()==null?0:b.getPointsRedeemed(),b.getVoucherCode(),b.getExpiresAt(),b.getCreatedAt(),b.getConfirmedAt(),b.getCheckedInAt(),b.getRefundRequestedAt(),b.getRefundedAt(),b.getRefundAmount(),b.getRefundFeeAmount(),b.getRefundRatePercent(),b.getRefundPolicyCode(),Boolean.TRUE.equals(b.getRefundAutomatic()),b.getRefundReason(),seatDtos,con);
    }
    private String normalizeIdempotencyKey(String raw) {
        if(raw==null||raw.isBlank()) return null;
        String key=raw.trim();
        if(key.length()<8||key.length()>80||!key.matches("[A-Za-z0-9._:-]+"))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Idempotency-Key phải dài 8-80 ký tự và chỉ gồm chữ, số, dấu chấm, gạch dưới, gạch ngang hoặc dấu hai chấm");
        return key;
    }

    private String requestFingerprint(CreateBookingRequest req) {
        List<String> seatIds=req.seatIds().stream().filter(Objects::nonNull).map(UUID::toString).distinct().sorted().toList();
        Map<UUID,Integer> concessions=new TreeMap<>(Comparator.comparing(UUID::toString));
        if(req.concessions()!=null) for(ConcessionItemRequest item:req.concessions())
            if(item!=null&&item.productId()!=null) concessions.merge(item.productId(),item.quantity(),Integer::sum);
        String concessionPart=concessions.entrySet().stream().map(e->e.getKey()+":"+e.getValue()).reduce((a,b)->a+","+b).orElse("");
        String voucher=req.voucherCode()==null?"":req.voucherCode().trim().toUpperCase(Locale.ROOT);
        int points=req.redeemPoints()==null?0:req.redeemPoints();
        String canonical="showtime="+req.showtimeId()+";seats="+String.join(",",seatIds)+";concessions="+concessionPart+";voucher="+voucher+";points="+points;
        try {
            byte[] digest=MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 unavailable", impossible);
        }
    }

    private String rootCauseMessage(Throwable error) {
        Throwable root=error;
        while(root.getCause()!=null) root=root.getCause();
        return root.getMessage()==null?"":root.getMessage();
    }

    private BigDecimal nz(BigDecimal v){return v==null?BigDecimal.ZERO:v;}
}
