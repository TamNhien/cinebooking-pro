package com.cinebooking.seat;

import jakarta.validation.constraints.NotEmpty;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public final class SeatDtos {
    private SeatDtos() {}
    public record SeatResponse(UUID id, String code, String rowLabel, Integer seatNumber, String seatType,
                               BigDecimal basePrice, BigDecimal seatModifier, BigDecimal dynamicAdjustment, BigDecimal price,
                               List<String> pricingRules, String status, boolean heldByMe) {}
    public record SeatMapResponse(UUID showtimeId, long holdTtlSeconds, long holdRemainingSeconds,
                                  long serverEpochMs, long holdExpiresAtEpochMs, int maxSelectableSeats,
                                  boolean preventSingleGap, List<SeatResponse> seats) {}
    public record HoldRequest(@NotEmpty List<UUID> seatIds) {}
    public record HoldResponse(boolean acquired, long ttlSeconds, long serverEpochMs,
                               long holdExpiresAtEpochMs, List<UUID> seatIds) {}
    public record SeatSuggestion(List<UUID> seatIds, List<String> seatCodes, BigDecimal totalPrice,
                                 BigDecimal dynamicAdjustment, int score, int centerScore, int rowScore,
                                 int orphanSafetyScore, String qualityLabel, String reason) {}
    public record SeatSuggestionResponse(UUID showtimeId, int requestedCount, List<SeatSuggestion> suggestions) {}
    public record SelectionValidationResponse(boolean allowed, List<String> orphanSeatCodes, String message) {}
}
