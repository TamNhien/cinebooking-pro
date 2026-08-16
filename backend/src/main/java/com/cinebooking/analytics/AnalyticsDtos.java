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
            List<StatusCount> paymentStatuses
    ) {}
}
