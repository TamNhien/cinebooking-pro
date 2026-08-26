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
            String fingerprint,
            String severity,
            String effectiveSeverity,
            String state,
            String domain,
            String title,
            String detail,
            long count,
            String href,
            Instant firstSeenAt,
            Instant stateChangedAt,
            String stateActor,
            boolean escalated
    ) {}

    public record AlertActionRequest(UUID cinemaId, String note) {}

    public record AlertHistoryItem(
            UUID id,
            String fingerprint,
            String action,
            String actorEmail,
            String detail,
            Instant createdAt
    ) {}

    public record Snapshot(
            UUID cinemaId,
            String cinemaName,
            String scope,
            String overallStatus,
            Instant generatedAt,
            int pollAfterSeconds,
            String realtimeTransport,
            String realtimeTopic,
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
