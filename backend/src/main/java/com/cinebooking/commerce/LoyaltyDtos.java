package com.cinebooking.commerce;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

public final class LoyaltyDtos {
    private LoyaltyDtos(){}

    public record LoyaltySummaryResponse(
            int balancePoints, int lifetimePoints, String membershipTier, BigDecimal earnMultiplier,
            String nextTier, Integer nextTierAt, int pointsToNextTier,
            int expiringSoonPoints, Instant nextExpiryAt, int pointExpiryMonths,
            LocalDate birthDate, boolean birthdayRewardEligible, Integer birthdayRewardYear) {}

    public record LoyaltyTransactionResponse(
            UUID id, UUID bookingId, String type, int points, String description, Instant createdAt,
            Instant expiresAt, Integer balanceAfter, String referenceType, String referenceId) {}

    public record LoyaltyRewardResponse(
            UUID id, String code, String name, String description, String rewardType, int pointsCost, boolean canRedeem,
            String discountType, BigDecimal discountValue, BigDecimal minOrderAmount, BigDecimal maxDiscount,
            int validityDays, UUID concessionProductId, String concessionProductName, Integer concessionQuantity) {}

    public record LoyaltyRedemptionResponse(
            UUID id, UUID rewardId, String rewardName, String rewardType, String redemptionCode, String voucherCode,
            int pointsCost, String status, Instant redeemedAt, Instant expiresAt, Instant claimedAt) {}

    public record OwnedVoucherResponse(
            UUID id, String code, String name, String discountType, BigDecimal discountValue,
            BigDecimal minOrderAmount, BigDecimal maxDiscount, Instant startsAt, Instant endsAt, boolean active) {}

    public record BirthdayRewardResponse(boolean claimed, String voucherCode, Instant endsAt, String message) {}

    public record AdminMemberResponse(
            UUID userId, String email, String fullName, int balancePoints, int lifetimePoints, String membershipTier,
            int expiringSoonPoints, Instant nextExpiryAt, LocalDate birthDate) {}

    public record AdminAdjustmentRequest(@NotNull @Min(-100000) @Max(100000) Integer deltaPoints,
                                         @NotBlank @Size(max=240) String reason) {}

    public record AdminBirthDateRequest(LocalDate birthDate, @NotBlank @Size(max=240) String reason) {}

    public record ConcessionClaimResponse(String redemptionCode, String rewardName, String customerEmail,
                                          String productName, int quantity, Instant claimedAt, String message) {}
}
