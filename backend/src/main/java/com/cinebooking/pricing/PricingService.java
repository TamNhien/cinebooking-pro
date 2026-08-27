package com.cinebooking.pricing;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.*;
import com.cinebooking.seat.SeatRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.*;
import java.time.*;
import java.util.*;

import static com.cinebooking.pricing.PricingDtos.*;

@Service
public class PricingService {
    private static final Set<String> TYPES = Set.of("FIXED","PERCENT");
    private final PricingRuleRepository rules;
    private final ShowtimeRepository showtimes;
    private final SeatRepository seats;
    private final AuditoriumRepository auditoriums;
    private final CinemaRepository cinemas;
    private final MovieRepository movies;
    private final DynamicPricingIntelligenceService intelligence;
    private final ZoneId zoneId;

    public PricingService(PricingRuleRepository rules, ShowtimeRepository showtimes, SeatRepository seats,
                          AuditoriumRepository auditoriums, CinemaRepository cinemas, MovieRepository movies,
                          DynamicPricingIntelligenceService intelligence,
                          @Value("${app.pricing.time-zone:Asia/Ho_Chi_Minh}") String timeZone) {
        this.rules=rules; this.showtimes=showtimes; this.seats=seats; this.auditoriums=auditoriums; this.cinemas=cinemas; this.movies=movies; this.intelligence=intelligence;
        ZoneId parsed;
        try { parsed=ZoneId.of(timeZone); } catch(Exception e) { parsed=ZoneId.of("Asia/Ho_Chi_Minh"); }
        this.zoneId=parsed;
    }

    public List<PricingRuleResponse> allRules(){
        return rules.findAllByOrderByPriorityDescCreatedAtDesc().stream().map(this::toDto).toList();
    }

    @Transactional
    public PricingRuleResponse saveRule(UUID id, PricingRuleRequest req){
        validateRequest(req);
        PricingRule rule=id==null?new PricingRule():rules.findById(id)
                .orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy quy tắc giá"));
        rule.setName(req.name().trim());
        rule.setCinemaId(req.cinemaId());
        rule.setAuditoriumId(req.auditoriumId());
        rule.setMovieId(req.movieId());
        rule.setSeatType(normalizeSeatType(req.seatType()));
        rule.setDaysOfWeek(encodeDays(req.daysOfWeek()));
        rule.setStartTime(req.startTime());
        rule.setEndTime(req.endTime());
        rule.setValidFrom(req.validFrom());
        rule.setValidTo(req.validTo());
        rule.setAdjustmentType(req.adjustmentType().trim().toUpperCase(Locale.ROOT));
        rule.setAdjustmentValue(req.adjustmentValue());
        rule.setPriority(req.priority()==null?0:req.priority());
        rule.setActive(req.active()==null?true:req.active());
        return toDto(rules.save(rule));
    }

    @Transactional
    public void deleteRule(UUID id){
        PricingRule rule=rules.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy quy tắc giá"));
        // booking_seat.price is a snapshot, therefore deleting a configuration rule never changes historical bookings.
        rules.delete(rule);
    }

    public PricingContext contextFor(Showtime showtime){
        Auditorium auditorium=auditoriums.findById(showtime.getAuditoriumId())
                .orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy phòng chiếu"));
        LocalDateTime local=LocalDateTime.ofInstant(showtime.getStartTime(),zoneId);
        List<PricingRule> active=rules.findByActiveTrueOrderByPriorityDescCreatedAtAsc();
        DynamicPricingIntelligenceService.MarketSnapshot market=intelligence.snapshot(showtime,auditorium);
        return new PricingContext(showtime,auditorium,auditorium.getCinemaId(),local,active,market);
    }

    public PriceQuote quote(PricingContext context, Seat seat){
        if(!seat.getAuditoriumId().equals(context.showtime().getAuditoriumId()))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Ghế không thuộc phòng của suất chiếu");
        BigDecimal base=nz(context.showtime().getBasePrice());
        BigDecimal seatModifier=nz(seat.getPriceModifier());
        BigDecimal before=base.add(seatModifier);
        BigDecimal manualDynamic=BigDecimal.ZERO;
        List<AppliedPricingRule> applied=new ArrayList<>();
        for(PricingRule rule:context.rules()){
            if(!matches(rule,context,seat))continue;
            BigDecimal amount=appliedAmount(rule,before);
            manualDynamic=manualDynamic.add(amount);
            applied.add(new AppliedPricingRule(rule.getId(),rule.getName(),rule.getAdjustmentType(),rule.getAdjustmentValue(),amount,rule.getPriority()));
        }
        DynamicPricingIntelligenceService.Evaluation automatic=intelligence.evaluate(context.market(),before);
        BigDecimal dynamic=manualDynamic.add(automatic.adjustmentAmount());
        BigDecimal finalPrice=before.add(dynamic).max(BigDecimal.ZERO).setScale(0,RoundingMode.HALF_UP);
        return new PriceQuote(base,seatModifier,before,manualDynamic,automatic.adjustmentAmount(),automatic.boundedAdjustmentPercent(),dynamic,finalPrice,automatic.signals(),List.copyOf(applied));
    }

    public PriceQuoteResponse preview(UUID showtimeId, UUID seatId){
        Showtime showtime=showtimes.findById(showtimeId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy suất chiếu"));
        Seat seat=seats.findById(seatId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy ghế"));
        PricingContext context=contextFor(showtime);
        PriceQuote q=quote(context,seat);
        Cinema cinema=cinemas.findById(context.cinemaId()).orElse(null);
        Movie movie=movies.findById(showtime.getMovieId()).orElse(null);
        DynamicPricingIntelligenceService.MarketSnapshot market=context.market();
        return new PriceQuoteResponse(showtime.getId(),seat.getId(),seat.getRowLabel()+seat.getSeatNumber(),seat.getSeatType().name(),
                cinema==null?"-":cinema.getName(),context.auditorium().getName(),movie==null?"-":movie.getTitle(),showtime.getStartTime(),zoneId.getId(),
                q.basePrice(),q.seatModifier(),q.priceBeforeDynamic(),q.manualDynamicAdjustment(),q.intelligenceAdjustment(),q.intelligencePercent(),q.dynamicAdjustment(),q.finalPrice(),
                market.occupancyRate(),market.activeSeatReservations(),market.sellableSeats(),market.bookingAttempts30m(),market.leadTimeHours(),
                DynamicPricingIntelligenceService.STRATEGY_VERSION,q.intelligenceSignals(),q.appliedRules());
    }

    private boolean matches(PricingRule rule,PricingContext c,Seat seat){
        if(rule.getCinemaId()!=null&&!rule.getCinemaId().equals(c.cinemaId()))return false;
        if(rule.getAuditoriumId()!=null&&!rule.getAuditoriumId().equals(c.showtime().getAuditoriumId()))return false;
        if(rule.getMovieId()!=null&&!rule.getMovieId().equals(c.showtime().getMovieId()))return false;
        if(rule.getSeatType()!=null&&!rule.getSeatType().equalsIgnoreCase(seat.getSeatType().name()))return false;
        LocalDate date=c.localShowtime().toLocalDate();
        LocalTime time=c.localShowtime().toLocalTime();
        if(rule.getValidFrom()!=null&&date.isBefore(rule.getValidFrom()))return false;
        if(rule.getValidTo()!=null&&date.isAfter(rule.getValidTo()))return false;
        Set<Integer> days=decodeDaysSet(rule.getDaysOfWeek());
        if(!days.isEmpty()&&!days.contains(c.localShowtime().getDayOfWeek().getValue()))return false;
        if(rule.getStartTime()!=null&&!inTimeWindow(time,rule.getStartTime(),rule.getEndTime()))return false;
        return true;
    }

    static boolean inTimeWindow(LocalTime value,LocalTime start,LocalTime end){
        if(start==null||end==null)return true;
        if(start.isBefore(end))return !value.isBefore(start)&&value.isBefore(end);
        // Cross-midnight window, e.g. 20:00 -> 02:00.
        return !value.isBefore(start)||value.isBefore(end);
    }

    private BigDecimal appliedAmount(PricingRule rule,BigDecimal before){
        if("PERCENT".equals(rule.getAdjustmentType()))
            return before.multiply(rule.getAdjustmentValue()).divide(BigDecimal.valueOf(100),0,RoundingMode.HALF_UP);
        return rule.getAdjustmentValue().setScale(0,RoundingMode.HALF_UP);
    }

    private void validateRequest(PricingRuleRequest req){
        if(req.name()==null||req.name().isBlank())throw new ApiException(HttpStatus.BAD_REQUEST,"Tên quy tắc giá không được để trống");
        String type=req.adjustmentType()==null?"":req.adjustmentType().trim().toUpperCase(Locale.ROOT);
        if(!TYPES.contains(type))throw new ApiException(HttpStatus.BAD_REQUEST,"adjustmentType phải là FIXED hoặc PERCENT");
        if(req.adjustmentValue()==null||req.adjustmentValue().compareTo(BigDecimal.ZERO)==0)throw new ApiException(HttpStatus.BAD_REQUEST,"Mức điều chỉnh phải khác 0");
        if("PERCENT".equals(type)&&(req.adjustmentValue().compareTo(BigDecimal.valueOf(-100))<0||req.adjustmentValue().compareTo(BigDecimal.valueOf(500))>0))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Điều chỉnh phần trăm phải trong khoảng -100% đến 500%");
        if("FIXED".equals(type)&&req.adjustmentValue().abs().compareTo(BigDecimal.valueOf(10_000_000))>0)
            throw new ApiException(HttpStatus.BAD_REQUEST,"Điều chỉnh cố định vượt giới hạn cho phép");
        if((req.startTime()==null)!=(req.endTime()==null))throw new ApiException(HttpStatus.BAD_REQUEST,"Giờ bắt đầu và kết thúc phải cùng được nhập hoặc cùng để trống");
        if(req.startTime()!=null&&req.startTime().equals(req.endTime()))throw new ApiException(HttpStatus.BAD_REQUEST,"Khung giờ bắt đầu và kết thúc không được trùng nhau");
        if(req.validFrom()!=null&&req.validTo()!=null&&req.validTo().isBefore(req.validFrom()))throw new ApiException(HttpStatus.BAD_REQUEST,"Ngày kết thúc phải từ ngày bắt đầu trở đi");
        normalizeDays(req.daysOfWeek());
        String seatType=normalizeSeatType(req.seatType());
        if(seatType!=null&&seatType.equals("BLOCKED"))throw new ApiException(HttpStatus.BAD_REQUEST,"Không cần cấu hình giá cho ghế BLOCKED");
        if(req.cinemaId()!=null&&!cinemas.existsById(req.cinemaId()))throw new ApiException(HttpStatus.BAD_REQUEST,"Rạp không tồn tại");
        Auditorium auditorium=null;
        if(req.auditoriumId()!=null){
            auditorium=auditoriums.findById(req.auditoriumId()).orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"Phòng chiếu không tồn tại"));
        }
        if(req.cinemaId()!=null&&auditorium!=null&&!req.cinemaId().equals(auditorium.getCinemaId()))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Phòng chiếu không thuộc rạp đã chọn");
        if(req.movieId()!=null&&!movies.existsById(req.movieId()))throw new ApiException(HttpStatus.BAD_REQUEST,"Phim không tồn tại");
    }

    private String normalizeSeatType(String value){
        if(value==null||value.isBlank())return null;
        String type=value.trim().toUpperCase(Locale.ROOT);
        try{SeatType.valueOf(type);}catch(Exception e){throw new ApiException(HttpStatus.BAD_REQUEST,"Loại ghế không hợp lệ: "+value);}
        return type;
    }

    private List<Integer> normalizeDays(List<Integer> days){
        if(days==null||days.isEmpty())return List.of();
        return days.stream().filter(Objects::nonNull).peek(d->{if(d<1||d>7)throw new ApiException(HttpStatus.BAD_REQUEST,"Ngày trong tuần phải từ 1 (Thứ Hai) đến 7 (Chủ Nhật)");}).distinct().sorted().toList();
    }
    private String encodeDays(List<Integer> days){List<Integer> normalized=normalizeDays(days);return normalized.isEmpty()?null:String.join(",",normalized.stream().map(String::valueOf).toList());}
    private List<Integer> decodeDays(String value){return new ArrayList<>(decodeDaysSet(value)).stream().sorted().toList();}
    private Set<Integer> decodeDaysSet(String value){
        if(value==null||value.isBlank())return Set.of();
        Set<Integer> out=new LinkedHashSet<>();
        for(String token:value.split(",")){try{int d=Integer.parseInt(token.trim());if(d>=1&&d<=7)out.add(d);}catch(Exception ignored){}}
        return out;
    }

    private PricingRuleResponse toDto(PricingRule rule){
        Auditorium auditorium=rule.getAuditoriumId()==null?null:auditoriums.findById(rule.getAuditoriumId()).orElse(null);
        Cinema cinema=rule.getCinemaId()==null?null:cinemas.findById(rule.getCinemaId()).orElse(null);
        if(cinema==null&&auditorium!=null)cinema=cinemas.findById(auditorium.getCinemaId()).orElse(null);
        Movie movie=rule.getMovieId()==null?null:movies.findById(rule.getMovieId()).orElse(null);
        return new PricingRuleResponse(rule.getId(),rule.getName(),rule.getCinemaId(),cinema==null?null:cinema.getName(),
                rule.getAuditoriumId(),auditorium==null?null:auditorium.getName(),rule.getMovieId(),movie==null?null:movie.getTitle(),
                rule.getSeatType(),decodeDays(rule.getDaysOfWeek()),rule.getStartTime(),rule.getEndTime(),rule.getValidFrom(),rule.getValidTo(),
                rule.getAdjustmentType(),rule.getAdjustmentValue(),rule.getPriority(),Boolean.TRUE.equals(rule.getActive()),rule.getCreatedAt(),rule.getUpdatedAt());
    }

    private BigDecimal nz(BigDecimal value){return value==null?BigDecimal.ZERO:value;}

    public record PricingContext(Showtime showtime, Auditorium auditorium, UUID cinemaId, LocalDateTime localShowtime, List<PricingRule> rules, DynamicPricingIntelligenceService.MarketSnapshot market) {}
    public record PriceQuote(BigDecimal basePrice, BigDecimal seatModifier, BigDecimal priceBeforeDynamic, BigDecimal manualDynamicAdjustment, BigDecimal intelligenceAdjustment, int intelligencePercent, BigDecimal dynamicAdjustment, BigDecimal finalPrice, List<DynamicPricingSignal> intelligenceSignals, List<AppliedPricingRule> appliedRules) {}
}
