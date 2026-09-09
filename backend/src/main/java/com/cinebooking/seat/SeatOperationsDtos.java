package com.cinebooking.seat;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class SeatOperationsDtos {
    private SeatOperationsDtos(){}

    public record SeatConsistencySummary(
            String strategyVersion,
            String holdAuthority,
            boolean redisAvailable,
            long holdTtlSeconds,
            long activeHolds,
            long expiringWithin60Seconds,
            long convertedLast24Hours,
            long expiredLast24Hours,
            long releasedLast24Hours,
            long conflictsLast24Hours,
            Instant serverTime,
            List<SeatHoldItem> recentHolds){}

    public record SeatHoldItem(
            UUID id,
            UUID holdToken,
            UUID showtimeId,
            String movieTitle,
            String seatCode,
            String userEmail,
            String state,
            Instant createdAt,
            Instant refreshedAt,
            Instant expiresAt,
            Instant releasedAt,
            UUID convertedBookingId,
            String lastEvent){}

    public record ReconcileResponse(int expiredRows,int activeRows,int mirroredRows,boolean redisAvailable,String authority){}
}
