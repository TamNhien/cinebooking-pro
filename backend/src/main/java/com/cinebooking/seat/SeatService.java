package com.cinebooking.seat;

import com.cinebooking.booking.BookingSeatRepository;
import com.cinebooking.booking.BookingService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.Seat;
import com.cinebooking.domain.Showtime;
import com.cinebooking.movie.ShowtimeRepository;
import com.cinebooking.pricing.PricingService;
import com.cinebooking.websocket.SeatEventPublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

import static com.cinebooking.seat.SeatDtos.*;

@Service
public class SeatService {
    private final ShowtimeRepository showtimes;
    private final SeatRepository seats;
    private final BookingSeatRepository bookingSeats;
    private final BookingService bookingService;
    private final SeatHoldService holds;
    private final SeatEventPublisher events;
    private final PricingService pricing;
    private final SeatRecommendationEngine recommendations;
    private final int maxSelectableSeats;
    private final boolean preventSingleGap;

    public SeatService(ShowtimeRepository showtimes, SeatRepository seats, BookingSeatRepository bookingSeats,
                       BookingService bookingService, SeatHoldService holds, SeatEventPublisher events, PricingService pricing,
                       SeatRecommendationEngine recommendations,
                       @Value("${app.seat-selection.max-seats:8}") int maxSelectableSeats,
                       @Value("${app.seat-selection.prevent-single-gap:true}") boolean preventSingleGap) {
        this.showtimes=showtimes; this.seats=seats; this.bookingSeats=bookingSeats; this.bookingService=bookingService;
        this.holds=holds; this.events=events; this.pricing=pricing; this.recommendations=recommendations;
        if (maxSelectableSeats < 1 || maxSelectableSeats > 20) throw new IllegalArgumentException("app.seat-selection.max-seats must be 1-20");
        this.maxSelectableSeats=maxSelectableSeats; this.preventSingleGap=preventSingleGap;
    }

    public SeatMapResponse map(UUID showtimeId, UUID currentUserId) {
        bookingService.repairSeatReservations(showtimeId);
        Showtime showtime = requireShowtime(showtimeId);
        List<SeatResponse> result = seatResponses(showtime,currentUserId);
        List<UUID> mine = result.stream().filter(SeatResponse::heldByMe).map(SeatResponse::id).toList();
        long now = System.currentTimeMillis();
        long remaining = holds.remainingSeconds(showtimeId,mine,currentUserId);
        long remainingMs = holds.remainingMillis(showtimeId,mine,currentUserId);
        long expiresAt = remainingMs <= 0 ? 0 : now + remainingMs;
        return new SeatMapResponse(showtimeId, holds.ttlSeconds(), remaining, now, expiresAt,
                maxSelectableSeats, preventSingleGap, result);
    }

    public SeatSuggestionResponse suggestions(UUID showtimeId, int count, UUID currentUserId) {
        if (count < 1 || count > maxSelectableSeats)
            throw new ApiException(HttpStatus.BAD_REQUEST,"Số ghế gợi ý phải từ 1 đến "+maxSelectableSeats);
        SeatMapResponse map = map(showtimeId,currentUserId);
        return new SeatSuggestionResponse(showtimeId,count,recommendations.suggest(map.seats(),count,5));
    }

    public SelectionValidationResponse validateSelection(UUID showtimeId, List<UUID> seatIds, UUID currentUserId) {
        List<UUID> unique = normalizeSelection(seatIds);
        SeatMapResponse map = map(showtimeId,currentUserId);
        ensureSelectedSeatsAreAvailable(map.seats(),unique);
        if (!preventSingleGap) return new SelectionValidationResponse(true,List.of(),"OK");
        return recommendations.validate(map.seats(),unique);
    }

    public HoldResponse hold(UUID showtimeId, List<UUID> seatIds, UUID userId) {
        bookingService.repairSeatReservations(showtimeId);
        Showtime showtime = requireShowtime(showtimeId);
        List<UUID> unique = normalizeSelection(seatIds);
        List<Seat> selected = seats.findByIdIn(unique);
        if (selected.size() != unique.size() || selected.stream().anyMatch(s -> !s.getAuditoriumId().equals(showtime.getAuditoriumId())))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Ghế không thuộc phòng chiếu này");
        if(selected.stream().anyMatch(s->s.getSeatType()==com.cinebooking.domain.SeatType.BLOCKED))
            throw new ApiException(HttpStatus.CONFLICT,"Có ghế đang bị khóa/không sử dụng");
        Set<UUID> reserved = new HashSet<>(bookingSeats.findReservedSeatIds(showtimeId));
        if (unique.stream().anyMatch(reserved::contains)) throw new ApiException(HttpStatus.CONFLICT,"Có ghế đã được đặt");

        if (preventSingleGap) {
            List<SeatResponse> current = seatResponses(showtime,userId);
            ensureSelectedSeatsAreAvailable(current,unique);
            SelectionValidationResponse validation = recommendations.validate(current,unique);
            if (!validation.allowed()) throw new ApiException(HttpStatus.CONFLICT,validation.message());
        }

        boolean ok = holds.acquire(showtimeId, unique, userId);
        if (!ok) throw new ApiException(HttpStatus.CONFLICT,"Có ghế đang được người khác giữ");
        events.publish(showtimeId,"HELD",unique);
        long now = System.currentTimeMillis();
        long remainingMs = holds.remainingMillis(showtimeId,unique,userId);
        long expiresAt = remainingMs <= 0 ? now + holds.ttlSeconds()*1000L : now + remainingMs;
        return new HoldResponse(true, holds.ttlSeconds(), now, expiresAt, unique);
    }

    public void release(UUID showtimeId, List<UUID> seatIds, UUID userId) {
        holds.release(showtimeId, seatIds, userId);
        events.publish(showtimeId,"RELEASED",seatIds);
    }

    private Showtime requireShowtime(UUID showtimeId) {
        return showtimes.findById(showtimeId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy suất chiếu"));
    }

    private List<UUID> normalizeSelection(List<UUID> seatIds) {
        List<UUID> unique = seatIds == null ? List.of() : seatIds.stream().filter(Objects::nonNull).distinct().toList();
        if (unique.isEmpty()) throw new ApiException(HttpStatus.BAD_REQUEST,"Hãy chọn ít nhất một ghế");
        if (unique.size() > maxSelectableSeats)
            throw new ApiException(HttpStatus.BAD_REQUEST,"Mỗi booking được chọn tối đa "+maxSelectableSeats+" ghế");
        return unique;
    }

    private void ensureSelectedSeatsAreAvailable(List<SeatResponse> map, List<UUID> selected) {
        Map<UUID,SeatResponse> byId = new HashMap<>();
        for (SeatResponse seat : map) byId.put(seat.id(),seat);
        for (UUID id : selected) {
            SeatResponse seat=byId.get(id);
            if (seat==null) throw new ApiException(HttpStatus.BAD_REQUEST,"Ghế không thuộc suất chiếu này");
            if (!"AVAILABLE".equals(seat.status()) && !seat.heldByMe())
                throw new ApiException(HttpStatus.CONFLICT,"Ghế "+seat.code()+" không còn khả dụng");
        }
    }

    private List<SeatResponse> seatResponses(Showtime showtime, UUID currentUserId) {
        List<Seat> all = seats.findByAuditoriumIdOrderByRowLabelAscSeatNumberAsc(showtime.getAuditoriumId());
        Set<UUID> reserved = new HashSet<>(bookingSeats.findReservedSeatIds(showtime.getId()));
        List<UUID> ids = all.stream().map(Seat::getId).toList();
        List<String> holders = holds.holders(showtime.getId(), ids);
        PricingService.PricingContext pricingContext=pricing.contextFor(showtime);
        List<SeatResponse> result = new ArrayList<>();
        for (int i=0;i<all.size();i++) {
            Seat s = all.get(i);
            String holder = i < holders.size() ? holders.get(i) : null;
            String status = s.getSeatType()==com.cinebooking.domain.SeatType.BLOCKED ? "BLOCKED" : reserved.contains(s.getId()) ? "BOOKED" : holder != null ? "HELD" : "AVAILABLE";
            boolean heldByMe = currentUserId != null && currentUserId.toString().equals(holder);
            PricingService.PriceQuote quote=pricing.quote(pricingContext,s);
            List<String> ruleNames=new ArrayList<>();
            ruleNames.addAll(quote.appliedRules().stream().map(x->x.name()).toList());
            ruleNames.addAll(quote.intelligenceSignals().stream()
                    .filter(x->x.adjustmentPercent()!=0)
                    .map(x->"V62 " + x.label() + " " + (x.adjustmentPercent()>0?"+":"") + x.adjustmentPercent() + "%")
                    .toList());
            result.add(new SeatResponse(s.getId(), s.getRowLabel()+s.getSeatNumber(), s.getRowLabel(), s.getSeatNumber(), s.getSeatType().name(),
                    quote.basePrice(),quote.seatModifier(),quote.dynamicAdjustment(),quote.finalPrice(),List.copyOf(ruleNames),status,heldByMe));
        }
        return result;
    }
}
