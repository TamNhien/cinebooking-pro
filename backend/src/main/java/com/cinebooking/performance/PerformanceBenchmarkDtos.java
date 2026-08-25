package com.cinebooking.performance;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class PerformanceBenchmarkDtos {
    private PerformanceBenchmarkDtos() {}

    public record CinemaOption(UUID cinemaId, String cinemaName) {}

    public record BranchPerformance(
            UUID cinemaId,
            String cinemaName,
            int revenueRank,
            BigDecimal revenue,
            BigDecimal previousRevenue,
            Double revenueDeltaPct,
            double revenueSharePct,
            long bookings,
            long tickets,
            long occupiedSeats,
            long capacity,
            double occupancyRate,
            BigDecimal averageOrderValue,
            BigDecimal forecastNext7d
    ) {}

    public record MoviePerformance(
            UUID movieId,
            String movieTitle,
            BigDecimal revenue,
            long tickets
    ) {}

    public record DailyPerformance(
            LocalDate day,
            BigDecimal revenue,
            long bookings,
            long tickets
    ) {}

    public record Scorecard(
            UUID cinemaId,
            String cinemaName,
            String scope,
            int periodDays,
            LocalDate fromDate,
            LocalDate toDate,
            Instant generatedAt,
            BigDecimal revenue,
            BigDecimal previousRevenue,
            Double revenueDeltaPct,
            long bookings,
            long tickets,
            double occupancyRate,
            BigDecimal averageOrderValue,
            BigDecimal forecastNext7d,
            List<BranchPerformance> branches,
            List<MoviePerformance> topMovies,
            List<DailyPerformance> daily
    ) {}
}
