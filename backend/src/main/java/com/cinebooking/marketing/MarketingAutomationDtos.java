package com.cinebooking.marketing;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class MarketingAutomationDtos {
    private MarketingAutomationDtos() {}

    public record MarketingSegment(
            String code,
            String label,
            String definition,
            long customers,
            String recommendedAction,
            int defaultDiscountPercent
    ) {}

    public record AudienceMember(
            String customerRef,
            String fullName,
            String maskedEmail,
            String membershipTier,
            LocalDate lastBookingDate,
            long recencyDays,
            long lifetimeBookings,
            BigDecimal lifetimeRevenue
    ) {}

    public record MarketingOverview(
            String strategyVersion,
            Instant generatedAt,
            long eligibleCustomers,
            List<MarketingSegment> segments
    ) {}

    public record CampaignRequest(
            String campaignCode,
            String segmentCode,
            String title,
            String message,
            String discountType,
            BigDecimal discountValue,
            BigDecimal minOrderAmount,
            BigDecimal maxDiscount,
            int validityDays,
            Boolean confirmed
    ) {}

    public record CampaignPreview(
            String strategyVersion,
            String campaignCode,
            String segmentCode,
            String segmentLabel,
            long matchedCustomers,
            int previewLimit,
            List<AudienceMember> audience,
            String voucherPolicy,
            String deliveryPolicy
    ) {}

    public record CampaignLaunchResult(
            String strategyVersion,
            String campaignCode,
            String segmentCode,
            long matchedCustomers,
            long vouchersCreated,
            long vouchersReused,
            long notificationsCreated,
            long notificationsSkipped,
            Instant launchedAt
    ) {}
}
