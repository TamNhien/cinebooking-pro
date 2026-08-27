package com.cinebooking.pricing;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class PricingDtos {
    private PricingDtos() {}

    public record PricingRuleRequest(
            @NotBlank @Size(max=160) String name,
            UUID cinemaId,
            UUID auditoriumId,
            UUID movieId,
            String seatType,
            List<@Min(1) @Max(7) Integer> daysOfWeek,
            LocalTime startTime,
            LocalTime endTime,
            LocalDate validFrom,
            LocalDate validTo,
            @NotBlank String adjustmentType,
            @NotNull BigDecimal adjustmentValue,
            Integer priority,
            Boolean active
    ) {}

    public record PricingRuleResponse(
            UUID id,
            String name,
            UUID cinemaId,
            String cinemaName,
            UUID auditoriumId,
            String auditoriumName,
            UUID movieId,
            String movieTitle,
            String seatType,
            List<Integer> daysOfWeek,
            LocalTime startTime,
            LocalTime endTime,
            LocalDate validFrom,
            LocalDate validTo,
            String adjustmentType,
            BigDecimal adjustmentValue,
            Integer priority,
            boolean active,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record PricingPreviewRequest(@NotNull UUID showtimeId, @NotNull UUID seatId) {}

    public record AppliedPricingRule(
            UUID ruleId,
            String name,
            String adjustmentType,
            BigDecimal adjustmentValue,
            BigDecimal appliedAmount,
            Integer priority
    ) {}

    public record DynamicPricingSignal(
            String code,
            String label,
            int adjustmentPercent,
            String evidence,
            String window
    ) {}

    public record DynamicPricingStrategyRule(
            String code,
            String label,
            String condition,
            int adjustmentPercent,
            String explanation
    ) {}

    public record DynamicPricingStrategyResponse(
            String strategyVersion,
            boolean enabled,
            int maxDiscountPercent,
            int maxSurchargePercent,
            String referencePricePolicy,
            String snapshotPolicy,
            List<DynamicPricingStrategyRule> rules
    ) {}

    public record DynamicPricingSimulationRequest(
            @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal occupancyRate,
            @NotNull @Min(0) @Max(10000) Integer bookingAttempts30m,
            @NotNull @DecimalMin("0") @DecimalMax("8760") BigDecimal leadTimeHours,
            @NotNull @DecimalMin("1") @DecimalMax("100000000") BigDecimal referencePrice
    ) {}

    public record DynamicPricingSimulationResponse(
            String strategyVersion,
            boolean enabled,
            BigDecimal occupancyRate,
            int bookingAttempts30m,
            BigDecimal leadTimeHours,
            BigDecimal referencePrice,
            int rawAdjustmentPercent,
            int boundedAdjustmentPercent,
            BigDecimal adjustmentAmount,
            BigDecimal simulatedPrice,
            List<DynamicPricingSignal> signals
    ) {}

    public record PriceQuoteResponse(
            UUID showtimeId,
            UUID seatId,
            String seatCode,
            String seatType,
            String cinemaName,
            String auditoriumName,
            String movieTitle,
            Instant showtimeStart,
            String pricingTimeZone,
            BigDecimal basePrice,
            BigDecimal seatModifier,
            BigDecimal priceBeforeDynamic,
            BigDecimal manualDynamicAdjustment,
            BigDecimal intelligenceAdjustment,
            int intelligencePercent,
            BigDecimal dynamicAdjustment,
            BigDecimal finalPrice,
            BigDecimal occupancyRate,
            long activeSeatReservations,
            long sellableSeats,
            long bookingAttempts30m,
            BigDecimal leadTimeHours,
            String strategyVersion,
            List<DynamicPricingSignal> intelligenceSignals,
            List<AppliedPricingRule> appliedRules
    ) {}
}
