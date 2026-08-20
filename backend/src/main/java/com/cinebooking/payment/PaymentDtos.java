package com.cinebooking.payment;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class PaymentDtos {
    private PaymentDtos() {}
    public record StartPaymentRequest(@NotBlank String provider) {}
    public record PaymentStartResponse(UUID paymentId, UUID bookingId, String provider, String paymentUrl, String qrData, String deeplink, Instant expiresAt, boolean replayed) {}
    public record PaymentCheckoutResponse(UUID paymentId, UUID bookingId, String provider, String status, BigDecimal amount, String paymentUrl, String qrData, String deeplink, String providerOrderId, String providerTransactionId, String providerResponseCode, String providerMessage, Instant createdAt, Instant updatedAt, Instant expiresAt, Instant paidAt, Instant failedAt) {}
    public record PaymentResultResponse(UUID paymentId, UUID bookingId, String provider, String status, String bookingStatus) {}
    public record PaymentReturnResponse(boolean signatureValid, String provider, UUID paymentId, UUID bookingId, String paymentStatus, String bookingStatus, String providerCode, String message) {}
    public record PaymentHistoryItem(UUID paymentId, UUID bookingId, UUID payerUserId, String movieTitle, String provider, String status, BigDecimal amount, BigDecimal refundedAmount, String refundReference, String providerOrderId, String providerTransactionId, String providerResponseCode, String providerMessage, Instant createdAt, Instant updatedAt, Instant expiresAt, Instant paidAt, Instant failedAt, Instant refundedAt) {}
    public record ProviderAvailability(String provider, boolean configured, boolean mock, String mode) {}
}
