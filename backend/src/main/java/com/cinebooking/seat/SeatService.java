package com.cinebooking.seat;

import com.cinebooking.booking.BookingSeatRepository;
import com.cinebooking.booking.BookingService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.Seat;
import com.cinebooking.domain.Showtime;
import com.cinebooking.movie.ShowtimeRepository;
import com.cinebooking.pricing.PricingService;
import com.cinebooking.websocket.SeatEventPublisher;
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

    public SeatService(ShowtimeRepository showtimes, SeatRepository seats, BookingSeatRepository bookingSeats,
                       BookingService bookingService, SeatHoldService holds, SeatEventPublisher events, PricingService pricing) {
        this.showtimes=showtimes; this.seats=seats; this.bookingSeats=bookingSeats; this.bookingService=bookingService; this.holds=holds; this.events=events; this.pricing=pricing;
    }

    public SeatMapResponse map(UUID showtimeId, UUID currentUserId) {
        bookingService.repairSeatReservations(showtimeId);
        Showtime showtime = showtimes.findById(showtimeId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy suất chiếu"));
        List<Seat> all = seats.findByAuditoriumIdOrderByRowLabelAscSeatNumberAsc(showtime.getAuditoriumId());
        Set<UUID> reserved = new HashSet<>(bookingSeats.findReservedSeatIds(showtimeId));
        List<UUID> ids = all.stream().map(Seat::getId).toList();
        List<String> holders = holds.holders(showtimeId, ids);
        PricingService.PricingContext pricingContext=pricing.contextFor(showtime);
        List<SeatResponse> result = new ArrayList<>();
        for (int i=0;i<all.size();i++) {
            Seat s = all.get(i);
            String holder = i < holders.size() ? holders.get(i) : null;
            String status = s.getSeatType()==com.cinebooking.domain.SeatType.BLOCKED ? "BLOCKED" : reserved.contains(s.getId()) ? "BOOKED" : holder != null ? "HELD" : "AVAILABLE";
            boolean heldByMe = currentUserId != null && currentUserId.toString().equals(holder);
            PricingService.PriceQuote quote=pricing.quote(pricingContext,s);
            List<String> ruleNames=quote.appliedRules().stream().map(x->x.name()).toList();
            result.add(new SeatResponse(s.getId(), s.getRowLabel()+s.getSeatNumber(), s.getRowLabel(), s.getSeatNumber(), s.getSeatType().name(),
                    quote.basePrice(),quote.seatModifier(),quote.dynamicAdjustment(),quote.finalPrice(),ruleNames,status,heldByMe));
        }
        return new SeatMapResponse(showtimeId, holds.ttlSeconds(), result);
    }

    public HoldResponse hold(UUID showtimeId, List<UUID> seatIds, UUID userId) {
        bookingService.repairSeatReservations(showtimeId);
        Showtime showtime = showtimes.findById(showtimeId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy suất chiếu"));
        List<UUID> unique = seatIds.stream().distinct().toList();
        List<Seat> selected = seats.findByIdIn(unique);
        if (selected.size() != unique.size() || selected.stream().anyMatch(s -> !s.getAuditoriumId().equals(showtime.getAuditoriumId())))
            throw new ApiException(HttpStatus.BAD_REQUEST,"Ghế không thuộc phòng chiếu này");
        if(selected.stream().anyMatch(s->s.getSeatType()==com.cinebooking.domain.SeatType.BLOCKED)) throw new ApiException(HttpStatus.CONFLICT,"Có ghế đang bị khóa/không sử dụng");
        Set<UUID> reserved = new HashSet<>(bookingSeats.findReservedSeatIds(showtimeId));
        if (unique.stream().anyMatch(reserved::contains)) throw new ApiException(HttpStatus.CONFLICT,"Có ghế đã được đặt");
        boolean ok = holds.acquire(showtimeId, unique, userId);
        if (!ok) throw new ApiException(HttpStatus.CONFLICT,"Có ghế đang được người khác giữ");
        events.publish(showtimeId,"HELD",unique);
        return new HoldResponse(true, holds.ttlSeconds(), unique);
    }

    public void release(UUID showtimeId, List<UUID> seatIds, UUID userId) {
        holds.release(showtimeId, seatIds, userId);
        events.publish(showtimeId,"RELEASED",seatIds);
    }
}
