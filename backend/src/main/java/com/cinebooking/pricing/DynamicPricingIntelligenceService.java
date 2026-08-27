package com.cinebooking.pricing;

import com.cinebooking.booking.BookingRepository;
import com.cinebooking.booking.BookingSeatRepository;
import com.cinebooking.domain.Auditorium;
import com.cinebooking.domain.Showtime;
import com.cinebooking.seat.SeatRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static com.cinebooking.pricing.PricingDtos.*;

@Service
public class DynamicPricingIntelligenceService {
    public static final String STRATEGY_VERSION = "V62_RULESET_1";

    private final BookingSeatRepository bookingSeats;
    private final BookingRepository bookings;
    private final SeatRepository seats;
    private final boolean enabled;
    private final int maxDiscountPercent;
    private final int maxSurchargePercent;

    public DynamicPricingIntelligenceService(
            BookingSeatRepository bookingSeats,
            BookingRepository bookings,
            SeatRepository seats,
            @Value("${app.pricing.intelligence.enabled:true}") boolean enabled,
            @Value("${app.pricing.intelligence.max-discount-percent:10}") int maxDiscountPercent,
            @Value("${app.pricing.intelligence.max-surcharge-percent:25}") int maxSurchargePercent) {
        this.bookingSeats = bookingSeats;
        this.bookings = bookings;
        this.seats = seats;
        this.enabled = enabled;
        this.maxDiscountPercent = Math.max(0, Math.min(50, maxDiscountPercent));
        this.maxSurchargePercent = Math.max(0, Math.min(100, maxSurchargePercent));
    }

    public MarketSnapshot snapshot(Showtime showtime, Auditorium auditorium) {
        Instant now = Instant.now();
        long sellableSeats = seats.countSellableByAuditoriumId(auditorium.getId());
        long activeReservations = bookingSeats.countActiveByShowtimeId(showtime.getId());
        BigDecimal occupancyRate = sellableSeats <= 0
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(activeReservations)
                    .multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(sellableSeats), 1, RoundingMode.HALF_UP)
                    .min(BigDecimal.valueOf(100));
        long attempts30m = bookings.countByShowtimeIdAndCreatedAtAfter(showtime.getId(), now.minusSeconds(30 * 60L));
        long leadMinutes = Math.max(0, Duration.between(now, showtime.getStartTime()).toMinutes());
        BigDecimal leadTimeHours = BigDecimal.valueOf(leadMinutes)
                .divide(BigDecimal.valueOf(60), 1, RoundingMode.HALF_UP);
        return new MarketSnapshot(occupancyRate, activeReservations, sellableSeats, attempts30m, leadTimeHours);
    }

    public Evaluation evaluate(MarketSnapshot market, BigDecimal referencePrice) {
        BigDecimal safeReference = referencePrice == null ? BigDecimal.ZERO : referencePrice.max(BigDecimal.ZERO);
        if (!enabled) {
            return new Evaluation(0, 0, BigDecimal.ZERO, List.of());
        }

        List<DynamicPricingSignal> signals = new ArrayList<>();
        int raw = 0;

        int occupancyPercent = occupancyAdjustment(market.occupancyRate());
        raw += occupancyPercent;
        signals.add(new DynamicPricingSignal(
                "OCCUPANCY",
                "Mức lấp đầy",
                occupancyPercent,
                "Đã giữ/đặt " + market.activeSeatReservations() + "/" + market.sellableSeats() + " ghế (" + market.occupancyRate() + "%)",
                "realtime showtime snapshot"));

        int velocityPercent = velocityAdjustment(market.bookingAttempts30m());
        raw += velocityPercent;
        signals.add(new DynamicPricingSignal(
                "DEMAND_VELOCITY",
                "Tốc độ nhu cầu",
                velocityPercent,
                market.bookingAttempts30m() + " booking attempt trong 30 phút gần nhất",
                "30 minutes"));

        int leadPercent = leadTimeAdjustment(market.leadTimeHours());
        raw += leadPercent;
        signals.add(new DynamicPricingSignal(
                "LEAD_TIME",
                "Thời gian tới suất chiếu",
                leadPercent,
                "Còn khoảng " + market.leadTimeHours() + " giờ tới giờ chiếu",
                "time until showtime"));

        int bounded = Math.max(-maxDiscountPercent, Math.min(maxSurchargePercent, raw));
        BigDecimal amount = safeReference
                .multiply(BigDecimal.valueOf(bounded))
                .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        return new Evaluation(raw, bounded, amount, List.copyOf(signals));
    }

    public DynamicPricingStrategyResponse strategy() {
        return new DynamicPricingStrategyResponse(
                STRATEGY_VERSION,
                enabled,
                maxDiscountPercent,
                maxSurchargePercent,
                "V62 automation is calculated only on base price + seat modifier; manual admin rules remain explicit and additive.",
                "Occupancy and demand are measured when the quote is produced; booking_seat.price stores the final historical snapshot.",
                List.of(
                        new DynamicPricingStrategyRule("OCCUPANCY_LOW", "Low occupancy", "occupancy < 30%", -3, "Small early-demand discount."),
                        new DynamicPricingStrategyRule("OCCUPANCY_HIGH", "High occupancy", "occupancy >= 70% and < 85%", 6, "Demand-responsive uplift as seats become scarce."),
                        new DynamicPricingStrategyRule("OCCUPANCY_PEAK", "Peak occupancy", "occupancy >= 85%", 12, "Higher scarcity uplift near sell-out."),
                        new DynamicPricingStrategyRule("VELOCITY_WARM", "Warm demand", "booking attempts in 30m >= 3 and < 6", 3, "Respond to recent booking velocity."),
                        new DynamicPricingStrategyRule("VELOCITY_HOT", "Hot demand", "booking attempts in 30m >= 6", 6, "Stronger recent-demand response."),
                        new DynamicPricingStrategyRule("LEAD_EARLY", "Early booking", "lead time >= 168h", -4, "Reward bookings at least seven days ahead."),
                        new DynamicPricingStrategyRule("LEAD_24H", "Within 24 hours", "lead time <= 24h and > 6h", 3, "Short-horizon demand uplift."),
                        new DynamicPricingStrategyRule("LEAD_6H", "Within 6 hours", "lead time <= 6h", 5, "Late demand uplift close to showtime.")
                ));
    }

    public DynamicPricingSimulationResponse simulate(DynamicPricingSimulationRequest request) {
        MarketSnapshot market = new MarketSnapshot(
                request.occupancyRate().setScale(1, RoundingMode.HALF_UP),
                0,
                0,
                request.bookingAttempts30m(),
                request.leadTimeHours().setScale(1, RoundingMode.HALF_UP));
        Evaluation evaluation = evaluate(market, request.referencePrice());
        BigDecimal simulated = request.referencePrice().add(evaluation.adjustmentAmount()).max(BigDecimal.ZERO).setScale(0, RoundingMode.HALF_UP);
        return new DynamicPricingSimulationResponse(
                STRATEGY_VERSION,
                enabled,
                market.occupancyRate(),
                request.bookingAttempts30m(),
                market.leadTimeHours(),
                request.referencePrice().setScale(0, RoundingMode.HALF_UP),
                evaluation.rawAdjustmentPercent(),
                evaluation.boundedAdjustmentPercent(),
                evaluation.adjustmentAmount(),
                simulated,
                evaluation.signals());
    }

    private int occupancyAdjustment(BigDecimal occupancy) {
        if (occupancy.compareTo(BigDecimal.valueOf(85)) >= 0) return 12;
        if (occupancy.compareTo(BigDecimal.valueOf(70)) >= 0) return 6;
        if (occupancy.compareTo(BigDecimal.valueOf(30)) < 0) return -3;
        return 0;
    }

    private int velocityAdjustment(long attempts30m) {
        if (attempts30m >= 6) return 6;
        if (attempts30m >= 3) return 3;
        return 0;
    }

    private int leadTimeAdjustment(BigDecimal leadTimeHours) {
        if (leadTimeHours.compareTo(BigDecimal.valueOf(6)) <= 0) return 5;
        if (leadTimeHours.compareTo(BigDecimal.valueOf(24)) <= 0) return 3;
        if (leadTimeHours.compareTo(BigDecimal.valueOf(168)) >= 0) return -4;
        return 0;
    }

    public record MarketSnapshot(
            BigDecimal occupancyRate,
            long activeSeatReservations,
            long sellableSeats,
            long bookingAttempts30m,
            BigDecimal leadTimeHours) {}

    public record Evaluation(
            int rawAdjustmentPercent,
            int boundedAdjustmentPercent,
            BigDecimal adjustmentAmount,
            List<DynamicPricingSignal> signals) {}
}
