package com.cinebooking.retention;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class RetentionIntelligenceDtos {
    private RetentionIntelligenceDtos() {}

    public record CinemaOption(UUID cinemaId, String cinemaName) {}

    public record LifecycleSegment(
            String code,
            String label,
            String definition,
            long customers
    ) {}

    public record CohortRetention(
            LocalDate cohortMonth,
            long acquiredCustomers,
            long returnedWithin30Days,
            double retention30dRate
    ) {}

    public record DailyRetention(
            LocalDate day,
            long newCustomers,
            long returningCustomers,
            long bookings,
            BigDecimal revenue
    ) {}

    public record RetentionScorecard(
            UUID cinemaId,
            String cinemaName,
            String scope,
            int periodDays,
            LocalDate fromDate,
            LocalDate toDate,
            Instant generatedAt,
            long activeCustomers,
            long newCustomers,
            long returningCustomers,
            long repeatCustomers,
            double repeatCustomerRate,
            long bookings,
            double bookingsPerCustomer,
            BigDecimal revenue,
            BigDecimal revenuePerCustomer,
            List<LifecycleSegment> lifecycle,
            List<CohortRetention> cohorts,
            List<DailyRetention> daily
    ) {}
}
