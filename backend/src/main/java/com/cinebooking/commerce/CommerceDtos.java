package com.cinebooking.commerce;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class CommerceDtos {
    private CommerceDtos(){}

    public record ProductResponse(
            UUID id, String name, String description, BigDecimal price, String imageUrl,
            boolean active, int sortOrder,
            boolean inventoryEnabled, int stockOnHand, int stockReserved, int stockAvailable,
            int lowStockThreshold, boolean lowStock, boolean soldOut) {}

    public record ProductRequest(
            @NotBlank @Size(max=160) String name,
            @Size(max=1000) String description,
            @NotNull @DecimalMin("0") BigDecimal price,
            String imageUrl,
            Boolean active,
            Integer sortOrder,
            Boolean inventoryEnabled,
            @Min(0) Integer lowStockThreshold) {}

    public record VoucherResponse(UUID id,String code,String name,String discountType,BigDecimal discountValue,BigDecimal minOrderAmount,BigDecimal maxDiscount,Instant startsAt,Instant endsAt,Integer usageLimit,Integer usedCount,boolean active){}
    public record VoucherRequest(@NotBlank @Size(max=60) String code,@NotBlank @Size(max=160) String name,@NotBlank String discountType,@NotNull @DecimalMin("0.01") BigDecimal discountValue,@DecimalMin("0") BigDecimal minOrderAmount,BigDecimal maxDiscount,Instant startsAt,Instant endsAt,Integer usageLimit,Boolean active){}
    public record VoucherQuoteRequest(@NotBlank String code,@NotNull @DecimalMin("0") BigDecimal orderAmount){}
    public record VoucherQuoteResponse(String code,String name,BigDecimal discountAmount,BigDecimal finalAmount){}
    public record LoyaltyTransactionResponse(UUID id,UUID bookingId,String type,int points,String description,Instant createdAt){}
}
