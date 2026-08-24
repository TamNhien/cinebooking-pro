package com.cinebooking.movie;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

import static com.cinebooking.movie.AdminCatalogDtos.*;

@Service
public class SmartShowtimePlanningService {
    static final String STRATEGY_VERSION = "V49-DEMAND-BALANCED-2";
    private static final int MAX_DAYS = 31;
    private static final long MIN_MOVIE_SPACING_MINUTES = 45;

    private final MovieRepository movies;
    private final CinemaRepository cinemas;
    private final AuditoriumRepository auditoriums;
    private final ShowtimeRepository showtimes;
    private final AuditoriumBlackoutRepository blackouts;
    private final ShowtimePlanningRunRepository runs;
    private final MovieService movieService;
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final long turnaroundMinutes;
    private final ZoneId zone;

    public SmartShowtimePlanningService(MovieRepository movies,
                                        CinemaRepository cinemas,
                                        AuditoriumRepository auditoriums,
                                        ShowtimeRepository showtimes,
                                        AuditoriumBlackoutRepository blackouts,
                                        ShowtimePlanningRunRepository runs,
                                        MovieService movieService,
                                        JdbcTemplate jdbc,
                                        ObjectMapper mapper,
                                        @Value("${app.showtime.turnaround-minutes:15}") long turnaroundMinutes,
                                        @Value("${app.showtime.zone:Asia/Ho_Chi_Minh}") String zoneId) {
        this.movies=movies; this.cinemas=cinemas; this.auditoriums=auditoriums; this.showtimes=showtimes;
        this.blackouts=blackouts; this.runs=runs; this.movieService=movieService; this.jdbc=jdbc; this.mapper=mapper;
        this.turnaroundMinutes=Math.max(0,turnaroundMinutes); this.zone=ZoneId.of(zoneId);
    }

    @Transactional(readOnly=true)
    public SmartShowtimePlanPreview preview(SmartShowtimePlanRequest request){
        ValidatedSmartPlan plan=validate(request,false);
        return buildPreview(plan,request);
    }

    @Transactional
    public SmartShowtimeCommitResponse commit(SmartShowtimePlanRequest request,String actorEmail){
        ValidatedSmartPlan plan=validate(request,true);
        SmartShowtimePlanPreview preview=buildPreview(plan,request);
        if(preview.suggested()==0) throw new ApiException(HttpStatus.CONFLICT,"Không còn khung giờ phù hợp để tạo suất chiếu trong khoảng đã chọn");

        ShowtimePlanningRun run=new ShowtimePlanningRun();
        run.setCinemaId(request.cinemaId()); run.setMovieId(request.movieId());
        run.setFromDate(request.fromDate()); run.setToDate(request.toDate()); run.setTargetPerDay(request.targetPerDay());
        run.setOperatingStart(request.operatingStart()); run.setOperatingEnd(request.operatingEnd()); run.setIntervalMinutes(request.intervalMinutes());
        run.setBasePrice(request.basePrice()); run.setRequestedSlots(preview.requested()); run.setSuggestedSlots(preview.suggested());
        run.setConflictCount(preview.conflicts()); run.setHistoricalSamples(preview.historicalSamples()); run.setStrategy(STRATEGY_VERSION);
        run.setStatus("COMMITTED"); run.setCreatedBy(actorEmail); run.setCommittedAt(Instant.now());
        try{run.setPlanJson(mapper.writeValueAsString(preview.days()));}catch(Exception e){run.setPlanJson("[]");}
        run=runs.save(run);

        ShowtimeStatus status=parseStatus(request.status());
        List<Showtime> created=new ArrayList<>();
        for(SmartShowtimeDay day:preview.days()){
            for(SmartShowtimeSlot slot:day.slots()){
                Showtime s=new Showtime();
                s.setMovieId(request.movieId()); s.setAuditoriumId(slot.auditoriumId()); s.setStartTime(slot.startTime());
                s.setBasePrice(request.basePrice()); s.setStatus(status); s.setPlanningSource("SMART");
                s.setPlanningRunId(run.getId()); s.setPlanningScore(BigDecimal.valueOf(slot.score()).setScale(2,RoundingMode.HALF_UP));
                created.add(s);
            }
        }
        List<com.cinebooking.movie.MovieDtos.ShowtimeResponse> saved=showtimes.saveAll(created).stream().map(movieService::showtimeDto).toList();
        return new SmartShowtimeCommitResponse(run.getId(),saved.size(),preview,saved);
    }

    @Transactional(readOnly=true)
    public List<ShowtimePlanningRunResponse> recentRuns(UUID cinemaId){
        List<ShowtimePlanningRun> list=cinemaId==null?runs.findTop20ByOrderByCreatedAtDesc():runs.findTop20ByCinemaIdOrderByCreatedAtDesc(cinemaId);
        return list.stream().map(this::runDto).toList();
    }

    private ValidatedSmartPlan validate(SmartShowtimePlanRequest request,boolean lockRooms){
        Movie movie=movies.findById(request.movieId()).orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"movieId không tồn tại"));
        Cinema cinema=cinemas.findById(request.cinemaId()).orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"cinemaId không tồn tại"));
        if(request.toDate().isBefore(request.fromDate())) throw new ApiException(HttpStatus.BAD_REQUEST,"toDate phải từ fromDate trở đi");
        long days=ChronoUnit.DAYS.between(request.fromDate(),request.toDate())+1;
        if(days>MAX_DAYS) throw new ApiException(HttpStatus.BAD_REQUEST,"Smart Planner tối đa "+MAX_DAYS+" ngày/lần");
        if(!request.operatingEnd().isAfter(request.operatingStart())) throw new ApiException(HttpStatus.BAD_REQUEST,"Giờ đóng cửa phải sau giờ mở cửa");
        long window=Duration.between(request.operatingStart(),request.operatingEnd()).toMinutes();
        if(window < movie.getDurationMinutes()+turnaroundMinutes) throw new ApiException(HttpStatus.BAD_REQUEST,"Khung vận hành ngắn hơn thời lượng phim cộng thời gian dọn phòng");
        ShowtimeStatus status=parseStatus(request.status());
        if(status==ShowtimeStatus.CANCELLED) throw new ApiException(HttpStatus.BAD_REQUEST,"Smart Planner không tạo suất CANCELLED");

        List<Auditorium> rooms=auditoriums.findByCinemaIdOrderByNameAsc(request.cinemaId());
        if(rooms.isEmpty()) throw new ApiException(HttpStatus.CONFLICT,"Rạp chưa có phòng chiếu để lập lịch");
        if(lockRooms){
            List<Auditorium> locked=new ArrayList<>();
            rooms.stream().map(Auditorium::getId).sorted().forEach(id->{
                Auditorium room=auditoriums.findByIdForUpdate(id).orElseThrow(()->new ApiException(HttpStatus.CONFLICT,"Phòng chiếu vừa bị thay đổi"));
                if(!room.getCinemaId().equals(request.cinemaId())) throw new ApiException(HttpStatus.CONFLICT,"Phòng chiếu không còn thuộc rạp đã chọn");
                locked.add(room);
            });
            rooms=locked.stream().sorted(Comparator.comparing(Auditorium::getName)).toList();
        }
        return new ValidatedSmartPlan(movie,cinema,rooms,status);
    }

    private SmartShowtimePlanPreview buildPreview(ValidatedSmartPlan plan,SmartShowtimePlanRequest request){
        Map<UUID,Movie> movieMap=movies.findAll().stream().collect(Collectors.toMap(Movie::getId,m->m));
        Map<Integer,DemandSignal> movieDemand=loadDemand(request.cinemaId(),request.movieId());
        Map<Integer,DemandSignal> cinemaDemand=loadDemand(request.cinemaId(),null);
        int historySamples=!movieDemand.isEmpty()?movieDemand.values().stream().mapToInt(DemandSignal::samples).sum():cinemaDemand.values().stream().mapToInt(DemandSignal::samples).sum();

        Map<UUID,List<Showtime>> existing=new HashMap<>();
        Map<UUID,List<AuditoriumBlackout>> blackoutMap=new HashMap<>();
        for(Auditorium room:plan.rooms()){
            existing.put(room.getId(),showtimes.findByAuditoriumIdOrderByStartTimeAsc(room.getId()));
            blackoutMap.put(room.getId(),blackouts.findByAuditoriumIdOrderByStartTimeAsc(room.getId()));
        }

        List<SmartShowtimeDay> days=new ArrayList<>();
        int totalConflicts=0,totalCandidates=0,totalSuggested=0;
        for(LocalDate date=request.fromDate();!date.isAfter(request.toDate());date=date.plusDays(1)){
            List<Candidate> feasible=new ArrayList<>();
            int conflicts=0,candidates=0;
            ZonedDateTime open=ZonedDateTime.of(date,request.operatingStart(),zone);
            ZonedDateTime close=ZonedDateTime.of(date,request.operatingEnd(),zone);
            for(Auditorium room:plan.rooms()){
                for(ZonedDateTime cursor=open;!cursor.isAfter(close);cursor=cursor.plusMinutes(request.intervalMinutes())){
                    Instant start=cursor.toInstant();
                    Instant end=endTime(start,plan.movie().getDurationMinutes());
                    if(end.isAfter(close.toInstant())) continue;
                    candidates++;
                    if(hardConflict(room.getId(),start,end,existing.get(room.getId()),blackoutMap.get(room.getId()),movieMap)){
                        conflicts++; continue;
                    }
                    Score score=score(date,cursor.toLocalTime(),movieDemand,cinemaDemand);
                    feasible.add(new Candidate(room,start,end,score));
                }
            }

            feasible.sort(Comparator.comparingDouble((Candidate c)->c.score().value()).reversed()
                    .thenComparing(Candidate::start).thenComparing(c->c.room().getName()));
            List<Candidate> accepted=new ArrayList<>();
            for(Candidate candidate:feasible){
                if(accepted.size()>=request.targetPerDay()) break;
                boolean roomOverlap=accepted.stream().anyMatch(a->a.room().getId().equals(candidate.room().getId()) && overlaps(candidate.start(),candidate.end(),a.start(),a.end()));
                if(roomOverlap) continue;
                boolean tooClose=accepted.stream().anyMatch(a->Math.abs(Duration.between(a.start(),candidate.start()).toMinutes())<MIN_MOVIE_SPACING_MINUTES);
                if(tooClose) continue;
                boolean tooCloseExisting=existing.values().stream().flatMap(Collection::stream)
                        .filter(s->s.getStatus()!=ShowtimeStatus.CANCELLED && s.getMovieId().equals(request.movieId()))
                        .anyMatch(s->Math.abs(Duration.between(s.getStartTime(),candidate.start()).toMinutes())<MIN_MOVIE_SPACING_MINUTES);
                if(tooCloseExisting) continue;
                accepted.add(candidate);
            }

            List<SmartShowtimeSlot> slots=accepted.stream().sorted(Comparator.comparing(Candidate::start)).map(c->new SmartShowtimeSlot(
                    c.room().getId(),c.room().getName(),c.start(),c.end(),round(c.score().value()),round(c.score().historicalOccupancy()),c.score().samples(),c.score().reasons()
            )).toList();
            days.add(new SmartShowtimeDay(date,request.targetPerDay(),slots.size(),conflicts,candidates,slots));
            totalConflicts+=conflicts; totalCandidates+=candidates; totalSuggested+=slots.size();
        }
        int requested=Math.toIntExact((ChronoUnit.DAYS.between(request.fromDate(),request.toDate())+1)*request.targetPerDay());
        return new SmartShowtimePlanPreview(STRATEGY_VERSION,zone.getId(),turnaroundMinutes,MIN_MOVIE_SPACING_MINUTES,
                plan.cinema().getId(),plan.cinema().getName(),plan.movie().getId(),plan.movie().getTitle(),requested,totalSuggested,
                totalConflicts,totalCandidates,historySamples,days);
    }

    private boolean hardConflict(UUID auditoriumId,Instant start,Instant end,List<Showtime> current,List<AuditoriumBlackout> roomBlackouts,Map<UUID,Movie> movieMap){
        for(AuditoriumBlackout b:roomBlackouts) if(overlaps(start,end,b.getStartTime(),b.getEndTime())) return true;
        for(Showtime s:current){
            if(s.getStatus()==ShowtimeStatus.CANCELLED) continue;
            Movie m=movieMap.get(s.getMovieId()); if(m==null) continue;
            if(overlaps(start,end,s.getStartTime(),endTime(s.getStartTime(),m.getDurationMinutes()))) return true;
        }
        return false;
    }

    private Score score(LocalDate date,LocalTime time,Map<Integer,DemandSignal> movieDemand,Map<Integer,DemandSignal> cinemaDemand){
        int hour=time.getHour(); int key=date.getDayOfWeek().getValue()*100+hour;
        double heuristic=heuristic(date.getDayOfWeek(),hour);
        DemandSignal signal=movieDemand.get(key);
        String source="MOVIE_HISTORY";
        if(signal==null||signal.samples()<2){signal=cinemaDemand.get(key);source="CINEMA_HISTORY";}
        List<String> reasons=new ArrayList<>();
        double historicalOccupancy=0; int samples=0; double value=heuristic;
        if(signal!=null&&signal.samples()>0){
            historicalOccupancy=signal.occupancy()*100.0; samples=signal.samples();
            value=heuristic*0.38+historicalOccupancy*0.62;
            reasons.add(("MOVIE_HISTORY".equals(source)?"Lịch sử phim":"Lịch sử rạp")+" · lấp đầy "+Math.round(historicalOccupancy)+"% / "+samples+" suất");
        }else reasons.add("Chưa đủ lịch sử · dùng mô hình nhu cầu theo khung giờ");
        if(hour>=18&&hour<=21){value+=6;reasons.add("Khung giờ cao điểm buổi tối");}
        else if(hour>=15&&hour<=17) reasons.add("Khung giờ chiều có nhu cầu tốt");
        if(date.getDayOfWeek()==DayOfWeek.SATURDAY||date.getDayOfWeek()==DayOfWeek.SUNDAY){value+=5;reasons.add("Cuối tuần");}
        reasons.add("Đã loại trừ lịch trùng và khoảng bảo trì");
        return new Score(Math.max(0,Math.min(100,value)),historicalOccupancy,samples,List.copyOf(reasons));
    }

    private double heuristic(DayOfWeek dow,int hour){
        double base;
        if(hour>=18&&hour<=21) base=80;
        else if(hour>=15&&hour<=17) base=70;
        else if(hour>=11&&hour<=14) base=62;
        else if(hour>=9&&hour<=10) base=52;
        else if(hour>=22) base=58;
        else base=45;
        if(dow==DayOfWeek.FRIDAY) base+=4;
        if(dow==DayOfWeek.SATURDAY||dow==DayOfWeek.SUNDAY) base+=7;
        return Math.min(95,base);
    }

    private Map<Integer,DemandSignal> loadDemand(UUID cinemaId,UUID movieId){
        String movieClause=movieId==null?"":" AND s.movie_id=? ";
        String sql="""
            SELECT dow,hr,COUNT(*)::int AS samples,AVG(occupancy)::double precision AS occupancy
            FROM (
                SELECT s.id,
                       EXTRACT(ISODOW FROM timezone(?,s.start_time))::int AS dow,
                       EXTRACT(HOUR FROM timezone(?,s.start_time))::int AS hr,
                       CASE WHEN COUNT(DISTINCT st.id)=0 THEN 0::numeric
                            ELSE COUNT(DISTINCT CASE WHEN b.status IN ('CONFIRMED','REFUND_REQUESTED') AND bs.released_at IS NULL THEN bs.id END)::numeric
                                 / COUNT(DISTINCT st.id)::numeric END AS occupancy
                FROM showtime s
                JOIN auditorium a ON a.id=s.auditorium_id
                LEFT JOIN seat st ON st.auditorium_id=a.id
                LEFT JOIN booking b ON b.showtime_id=s.id
                LEFT JOIN booking_seat bs ON bs.booking_id=b.id
                WHERE a.cinema_id=? AND s.start_time<CURRENT_TIMESTAMP AND s.status<>'CANCELLED'
            """+movieClause+" GROUP BY s.id) hist GROUP BY dow,hr";
        Object[] args=movieId==null?new Object[]{zone.getId(),zone.getId(),cinemaId}:new Object[]{zone.getId(),zone.getId(),cinemaId,movieId};
        List<DemandRow> rows=jdbc.query(sql,(rs,rowNum)->new DemandRow(rs.getInt("dow"),rs.getInt("hr"),rs.getInt("samples"),rs.getDouble("occupancy")),args);
        Map<Integer,DemandSignal> result=new HashMap<>();
        for(DemandRow row:rows) result.put(row.dow()*100+row.hour(),new DemandSignal(row.occupancy(),row.samples()));
        return result;
    }

    private ShowtimePlanningRunResponse runDto(ShowtimePlanningRun run){
        return new ShowtimePlanningRunResponse(run.getId(),run.getCinemaId(),cinemas.findById(run.getCinemaId()).map(Cinema::getName).orElse(""),
                run.getMovieId(),movies.findById(run.getMovieId()).map(Movie::getTitle).orElse(""),run.getFromDate(),run.getToDate(),run.getTargetPerDay(),
                run.getOperatingStart(),run.getOperatingEnd(),run.getIntervalMinutes(),run.getBasePrice(),run.getRequestedSlots(),run.getSuggestedSlots(),
                run.getConflictCount(),run.getHistoricalSamples(),run.getStrategy(),run.getStatus(),run.getCreatedBy(),run.getCreatedAt(),run.getCommittedAt());
    }

    private ShowtimeStatus parseStatus(String value){
        try{return ShowtimeStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));}
        catch(Exception e){throw new ApiException(HttpStatus.BAD_REQUEST,"status suất chiếu không hợp lệ");}
    }
    private Instant endTime(Instant start,int movieMinutes){return start.plus(Duration.ofMinutes((long)movieMinutes+turnaroundMinutes));}
    static boolean overlaps(Instant aStart,Instant aEnd,Instant bStart,Instant bEnd){return aStart.isBefore(bEnd)&&aEnd.isAfter(bStart);}
    private static double round(double v){return Math.round(v*10.0)/10.0;}

    private record ValidatedSmartPlan(Movie movie,Cinema cinema,List<Auditorium> rooms,ShowtimeStatus status){}
    private record Candidate(Auditorium room,Instant start,Instant end,Score score){}
    private record Score(double value,double historicalOccupancy,int samples,List<String> reasons){}
    private record DemandSignal(double occupancy,int samples){}
    private record DemandRow(int dow,int hour,int samples,double occupancy){}
}
