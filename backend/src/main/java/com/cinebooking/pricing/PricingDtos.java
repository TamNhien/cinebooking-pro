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
            BigDecimal dynamicAdjustment,
            BigDecimal finalPrice,
            List<AppliedPricingRule> appliedRules
    ) {}
}
