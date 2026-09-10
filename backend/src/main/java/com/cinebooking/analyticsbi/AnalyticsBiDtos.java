package com.cinebooking.analyticsbi;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class AnalyticsBiDtos {
    private AnalyticsBiDtos() {}

    public record FunnelStage(
            String code,
            String label,
            long count,
            double conversionFromPreviousPercent,
            double conversionFromStartPercent
    ) {}

    public record BookingFunnel(
            String definition,
            List<FunnelStage> stages
    ) {}

    public record CohortRow(
            LocalDate cohortMonth,
            long registeredUsers,
            long activatedUsers,
            long repeat30dUsers,
            double activationRatePercent,
            double repeat30dRatePercent,
            boolean matured30d
    ) {}

    public record CustomerLtvRow(
            String customerRef,
            String maskedEmail,
            long paidBookings,
            BigDecimal realizedRevenue,
            BigDecimal averageOrderValue,
            Instant firstPaidAt,
            Instant lastPaidAt
    ) {}

    public record PaymentConversionRow(
            String provider,
            long attempts,
            long successfulAttempts,
            long failedAttempts,
            long otherAttempts,
            double successRatePercent,
            BigDecimal successfulAmount
    ) {}

    public record MovieEfficiencyRow(
            String movieTitle,
            long completedShowtimes,
            long ticketsSold,
            long seatCapacity,
            double occupancyRatePercent,
            BigDecimal realizedRevenue,
            BigDecimal revenuePerShowtime,
            BigDecimal revenuePerSeatOffered
    ) {}

    public record CinemaEfficiencyRow(
            String cinemaName,
            long completedShowtimes,
            long ticketsSold,
            long seatCapacity,
            double occupancyRatePercent,
            BigDecimal realizedRevenue,
            BigDecimal revenuePerShowtime,
            BigDecimal revenuePerSeatOffered
    ) {}

    public record AnalyticsBiSummary(
            String strategyVersion,
            Instant generatedAt,
            int windowDays,
            Instant windowStart,
            Instant windowEnd,
            BookingFunnel funnel,
            List<CohortRow> cohorts,
            List<CustomerLtvRow> topCustomersByRealizedLtv,
            List<PaymentConversionRow> paymentConversion,
            List<MovieEfficiencyRow> movieEfficiency,
            List<CinemaEfficiencyRow> cinemaEfficiency,
            List<String> evidencePolicy
    ) {}
}
