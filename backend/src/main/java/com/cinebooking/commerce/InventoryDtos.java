package com.cinebooking.commerce;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class InventoryDtos {
    private InventoryDtos(){}

    public record InventoryProductResponse(
            UUID productId, String name, BigDecimal price, boolean active, boolean inventoryEnabled,
            int stockOnHand, int stockReserved, int stockAvailable, int lowStockThreshold,
            boolean lowStock, boolean soldOut) {}

    public record InventorySummary(
            int totalProducts, int trackedProducts, int totalOnHand, int totalReserved,
            int totalAvailable, int lowStockProducts, int soldOutProducts,
            List<InventoryProductResponse> products) {}

    public record InventoryAdjustmentRequest(
            @NotNull UUID productId,
            @NotBlank String operation,
            @NotNull @Min(0) Integer quantity,
            @Size(max=300) String note) {}

    public record InventoryMovementResponse(
            UUID id, UUID productId, String productName, UUID bookingId, String movementType,
            int quantityDelta, int reservedDelta, int stockAfter, int reservedAfter,
            String actorEmail, String note, Instant createdAt) {}
}
