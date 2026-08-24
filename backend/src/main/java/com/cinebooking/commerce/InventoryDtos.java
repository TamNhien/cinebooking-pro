package com.cinebooking.commerce;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class InventoryDtos {
    private InventoryDtos(){}

    public record InventoryProductResponse(
            UUID productId, UUID cinemaId, String cinemaName, String name,
            BigDecimal basePrice, BigDecimal price, boolean priceOverride,
            boolean active, boolean inventoryEnabled,
            int stockOnHand, int stockReserved, int stockAvailable, int lowStockThreshold, int targetStock,
            boolean lowStock, boolean soldOut) {}

    public record InventorySummary(
            UUID cinemaId, String cinemaName,
            int totalProducts, int trackedProducts, int totalOnHand, int totalReserved,
            int totalAvailable, int lowStockProducts, int soldOutProducts,
            List<InventoryProductResponse> products) {}

    public record InventoryBranchOverview(UUID cinemaId,String cinemaName,int trackedProducts,int totalAvailable,int lowStockProducts,int soldOutProducts) {}

    public record InventoryAdjustmentRequest(
            @NotNull UUID cinemaId,
            @NotNull UUID productId,
            @NotBlank String operation,
            @NotNull @Min(0) Integer quantity,
            @Min(0) Integer lowStockThreshold,
            @Min(0) Integer targetStock,
            @Size(max=300) String note) {}

    public record InventoryTransferRequest(
            @NotNull UUID productId,
            @NotNull UUID fromCinemaId,
            @NotNull UUID toCinemaId,
            @Min(1) int quantity,
            @Size(max=300) String note) {}

    public record InventoryTransferResponse(String referenceKey,UUID productId,String productName,UUID fromCinemaId,String fromCinemaName,UUID toCinemaId,String toCinemaName,int quantity,int fromAvailable,int toAvailable) {}

    public record BranchPriceRequest(@NotNull UUID cinemaId,@NotNull UUID productId,@NotNull @DecimalMin("0") BigDecimal price,Boolean active) {}
    public record BranchPriceResponse(UUID cinemaId,UUID productId,String productName,BigDecimal basePrice,BigDecimal price,boolean active,boolean override,Instant updatedAt) {}

    public record InventoryMovementResponse(
            UUID id, UUID productId, String productName, UUID cinemaId, String cinemaName,
            UUID bookingId, String movementType,
            int quantityDelta, int reservedDelta, int stockAfter, int reservedAfter,
            String actorEmail, String referenceKey, String note, Instant createdAt) {}
}
