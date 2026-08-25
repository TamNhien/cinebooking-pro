package com.cinebooking.operationscontrol;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class OperationsControlCenterDtos {
    private OperationsControlCenterDtos() {}

    public record CinemaOption(UUID cinemaId, String cinemaName) {}

    public record DomainPulse(
            String domain,
            String label,
            String status,
            long primaryCount,
            long warningCount,
            String href
    ) {}

    public record AlertItem(
            String severity,
            String domain,
            String title,
            String detail,
            long count,
            String href
    ) {}

    public record Snapshot(
            UUID cinemaId,
            String cinemaName,
            String scope,
            String overallStatus,
            Instant generatedAt,
            int pollAfterSeconds,
            BigDecimal todayRevenue,
            long todayConfirmedBookings,
            long todayTickets,
            double todayOccupancyRate,
            long paymentReviewCount,
            long paymentFailedLastHour,
            long pendingBookings,
            long pendingBookingsPastDue,
            long pendingBookingsExpiringSoon,
            long equipmentOutOfService,
            long equipmentDegraded,
            long equipmentInMaintenance,
            long equipmentServiceOverdue,
            long staffWorkingNow,
            long staffScheduledToday,
            long uncoveredActiveShifts,
            long openSupportCases,
            long overdueSupportCases,
            long lowStockItems,
            long soldOutItems,
            long openIncidents,
            long criticalIncidents,
            List<DomainPulse> domains,
            List<AlertItem> alerts
    ) {}
}
