package com.cinebooking.crm;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class CrmAutomationDtos {
    private CrmAutomationDtos() {}

    public record CrmPlaybookV77(
            String code,
            String label,
            String definition,
            String recommendedAction,
            int defaultDiscountPercent,
            long eligibleCustomers,
            long contactableCustomers,
            long suppressedCustomers
    ) {}

    public record CrmSuppressionMetricV77(
            String reason,
            long customers
    ) {}

    public record CrmOutcomeV77(
            int windowDays,
            long promotionMessages,
            long inAppVisibleMessages,
            long readMessages,
            BigDecimal readRatePercent,
            long assistedConfirmedBookings,
            BigDecimal assistedRealizedRevenue
    ) {}

    public record CrmAutomationSummaryV77(
            String strategyVersion,
            Instant generatedAt,
            int frequencyCap7d,
            int cooldownHours,
            long eligibleCustomers,
            long contactableCustomers,
            long suppressedCustomers,
            List<CrmPlaybookV77> playbooks,
            List<CrmSuppressionMetricV77> suppressions,
            CrmOutcomeV77 outcome,
            List<String> evidencePolicy
    ) {}

    public record CrmAutomationRequestV77(
            String campaignCode,
            String playbookCode,
            String title,
            String message,
            String discountType,
            BigDecimal discountValue,
            BigDecimal minOrderAmount,
            BigDecimal maxDiscount,
            int validityDays,
            int maxRecipients,
            Boolean confirmed
    ) {}

    public record CrmAudienceMemberV77(
            String customerRef,
            String maskedEmail,
            String membershipTier,
            LocalDate lastBookingDate,
            long recencyDays,
            long lifetimeBookings,
            BigDecimal lifetimeRevenue,
            long promotionNotifications7d,
            Instant lastPromotionAt,
            boolean contactable,
            String suppressionReason
    ) {}

    public record CrmAutomationPreviewV77(
            String strategyVersion,
            String campaignCode,
            String playbookCode,
            String playbookLabel,
            long eligibleCustomers,
            long contactableCustomers,
            long suppressedCustomers,
            int maxRecipients,
            boolean executable,
            int previewLimit,
            List<CrmAudienceMemberV77> audience,
            String voucherPolicy,
            String deliveryPolicy,
            String safetyPolicy
    ) {}

    public record CrmAutomationExecutionV77(
            String strategyVersion,
            String campaignCode,
            String playbookCode,
            long eligibleCustomers,
            long contactableCustomers,
            long suppressedCustomers,
            long vouchersCreated,
            long vouchersReused,
            long notificationsCreated,
            long notificationsSkipped,
            Instant executedAt
    ) {}
}
