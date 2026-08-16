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
    public record SeatMapResponse(UUID showtimeId, long holdTtlSeconds, List<SeatResponse> seats) {}
    public record HoldRequest(@NotEmpty List<UUID> seatIds) {}
    public record HoldResponse(boolean acquired, long ttlSeconds, List<UUID> seatIds) {}
}
