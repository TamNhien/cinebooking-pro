package com.cinebooking.commandcenter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class CommandCenterDtos {
    private CommandCenterDtos() {}

    public record CinemaOption(UUID cinemaId, String cinemaName) {}

    public record AttentionItem(
            String severity,
            String domain,
            String title,
            long count,
            String href
    ) {}

    public record Summary(
            UUID cinemaId,
            String cinemaName,
            String scope,
            String status,
            Instant generatedAt,
            BigDecimal todayRevenue,
            long todayConfirmedBookings,
            long todayTickets,
            double todayOccupancyRate,
            BigDecimal forecastNext7d,
            long paymentReviewCount,
            long openSupportCases,
            long overdueSupportCases,
            long openMaintenanceOrders,
            long overdueMaintenanceOrders,
            long openStaffIncidents,
            long lowStockItems,
            long soldOutItems,
            List<AttentionItem> attention
    ) {}
}
