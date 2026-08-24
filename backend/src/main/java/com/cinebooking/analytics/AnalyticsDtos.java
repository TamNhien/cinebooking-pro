package com.cinebooking.analytics;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public final class AnalyticsDtos {
    private AnalyticsDtos() {}

    public record Kpi(
            BigDecimal revenue,
            long confirmedBookings,
            long users,
            long tickets,
            BigDecimal concessionRevenue,
            BigDecimal averageOrderValue,
            double occupancyRate,
            double paymentSuccessRate,
            double refundRate,
            long checkIns,
            long newUsers
    ) {}

    public record DailyPoint(LocalDate day, BigDecimal revenue, long bookings, long tickets, long checkIns) {}
    public record NameValue(String name, BigDecimal value, long count) {}
    public record StatusCount(String status, long count) {}

    public record CinemaPerformance(
            UUID cinemaId,
            String cinemaName,
            BigDecimal revenue,
            long bookings,
            long tickets,
            long capacity,
            double occupancyRate
    ) {}

    public record ShowtimePerformance(
            UUID showtimeId,
            String movieTitle,
            String cinemaName,
            String auditoriumName,
            Instant startTime,
            BigDecimal revenue,
            long tickets,
            long capacity,
            double occupancyRate
    ) {}

    public record SeatHeatCell(String rowLabel, int seatNumber, long bookings, BigDecimal revenue) {}
    public record HourlyDemand(int hour, long bookings, long tickets, BigDecimal revenue) {}

    public record StaffPerformance(
            UUID userId,
            String employeeCode,
            String fullName,
            String cinemaName,
            long checkedTickets
    ) {}

    // V51 - Analytics & Forecasting 3.0 contracts.
    public record PeriodWindow(
            LocalDate from,
            LocalDate to,
            BigDecimal revenue,
            long bookings,
            long tickets,
            double occupancyRate
    ) {}

    public record PeriodComparison(
            PeriodWindow current,
            PeriodWindow previous,
            double revenueDeltaPct,
            double bookingsDeltaPct,
            double ticketsDeltaPct,
            double occupancyDeltaPoints
    ) {}

    public record ForecastPoint(
            LocalDate day,
            BigDecimal revenue,
            double confidence,
            int matchingWeekdays
    ) {}

    public record RevenueForecast(
            String algorithm,
            LocalDate generatedFor,
            BigDecimal next7DaysRevenue,
            List<ForecastPoint> points
    ) {}

    public record MarginSummary(
            BigDecimal revenue,
            BigDecimal ticketRevenue,
            BigDecimal concessionRevenue,
            BigDecimal concessionCost,
            BigDecimal grossMargin,
            Double grossMarginRate,
            double costCoverageRate,
            long concessionUnits,
            long costedUnits
    ) {}

    public record AuditoriumPerformance(
            UUID auditoriumId,
            String auditoriumName,
            UUID cinemaId,
            String cinemaName,
            BigDecimal revenue,
            long bookings,
            long tickets,
            long capacity,
            double occupancyRate
    ) {}

    public record ConcessionCostBasis(
            UUID cinemaId,
            String cinemaName,
            UUID productId,
            String productName,
            BigDecimal sellingPrice,
            BigDecimal unitCost,
            boolean costKnown,
            Instant updatedAt
    ) {}

    public record CostBasisUpdate(
            UUID cinemaId,
            UUID productId,
            BigDecimal unitCost
    ) {}

    public record AnalyticsSnapshot(
            UUID id,
            UUID cinemaId,
            String cinemaName,
            String periodKind,
            LocalDate periodStart,
            LocalDate periodEnd,
            BigDecimal revenue,
            BigDecimal ticketRevenue,
            BigDecimal concessionRevenue,
            BigDecimal concessionCost,
            BigDecimal grossMargin,
            long bookings,
            long tickets,
            long capacity,
            double occupancyRate,
            double costCoverageRate,
            BigDecimal forecastNext7d,
            String forecastAlgorithm,
            Instant generatedAt
    ) {}

    public record Dashboard(
            Kpi kpi,
            List<DailyPoint> dailyRevenue,
            List<NameValue> topMovies,
            List<NameValue> paymentProviders,
            List<NameValue> topConcessions,
            List<CinemaPerformance> cinemaPerformance,
            List<ShowtimePerformance> topShowtimes,
            List<SeatHeatCell> seatHeatmap,
            List<HourlyDemand> hourlyDemand,
            List<StaffPerformance> staffPerformance,
            List<StatusCount> bookingStatuses,
            List<StatusCount> paymentStatuses,
            PeriodComparison periodComparison,
            RevenueForecast forecast,
            MarginSummary margin,
            List<AuditoriumPerformance> auditoriumPerformance,
            List<ConcessionCostBasis> concessionCostBasis,
            List<AnalyticsSnapshot> snapshots
    ) {
        // Backward-compatible constructor retained for V42/V43 export tests and older callers.
        public Dashboard(
                Kpi kpi,
                List<DailyPoint> dailyRevenue,
                List<NameValue> topMovies,
                List<NameValue> paymentProviders,
                List<NameValue> topConcessions,
                List<CinemaPerformance> cinemaPerformance,
                List<ShowtimePerformance> topShowtimes,
                List<SeatHeatCell> seatHeatmap,
                List<HourlyDemand> hourlyDemand,
                List<StaffPerformance> staffPerformance,
                List<StatusCount> bookingStatuses,
                List<StatusCount> paymentStatuses
        ) {
            this(
                    kpi, dailyRevenue, topMovies, paymentProviders, topConcessions,
                    cinemaPerformance, topShowtimes, seatHeatmap, hourlyDemand, staffPerformance,
                    bookingStatuses, paymentStatuses,
                    null,
                    new RevenueForecast("V51-WEEKDAY-WEIGHTED-MA-1", LocalDate.now(), BigDecimal.ZERO, List.of()),
                    null,
                    List.of(), List.of(), List.of()
            );
        }
    }
}
