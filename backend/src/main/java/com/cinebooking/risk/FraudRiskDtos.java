package com.cinebooking.risk;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class FraudRiskDtos {
    private FraudRiskDtos() {}

    public record RiskRule(String code, String label, String window, int maxPoints, String explanation) {}
    public record RiskSignal(String code, String label, int points, String evidence, String window) {}
    public record RiskCustomer(
            UUID userId,
            String customerRef,
            String fullName,
            String email,
            boolean accountEnabled,
            int riskScore,
            String riskLevel,
            String disposition,
            int bookings30m,
            int bookings24h,
            int failedPayments24h,
            int paymentAttempts24h,
            int voucherRedemptions24h,
            int refunds30d,
            int securityAlerts7d,
            int maxSecurityRisk7d,
            int failedLogins1h,
            int distinctLoginIps24h,
            Instant lastActivityAt,
            List<RiskSignal> signals
    ) {}

    public record RiskSummary(
            int totalCustomers,
            int watchCustomers,
            int highRiskCustomers,
            int criticalCustomers,
            int customersWithPaymentFailureSignal,
            int customersWithVelocitySignal,
            int customersWithSecuritySignal,
            Instant generatedAt,
            String scoringVersion
    ) {}

    public record RiskScorecard(RiskSummary summary, List<RiskRule> rules, List<RiskCustomer> customers) {}
    public record DispositionRequest(String disposition, String note) {}
    public record DispositionResult(UUID userId, String disposition, String note, String actorEmail, Instant updatedAt) {}
}
