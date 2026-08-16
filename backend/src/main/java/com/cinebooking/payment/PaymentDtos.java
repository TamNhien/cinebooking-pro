package com.cinebooking.payment;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public final class PaymentDtos {
    private PaymentDtos() {}
    public record StartPaymentRequest(@NotBlank String provider) {}
    public record PaymentStartResponse(UUID paymentId, UUID bookingId, String provider, String paymentUrl, String qrData, String deeplink) {}
    public record PaymentCheckoutResponse(UUID paymentId, UUID bookingId, String provider, String status, String paymentUrl, String qrData, String deeplink) {}
    public record PaymentResultResponse(UUID paymentId, UUID bookingId, String provider, String status, String bookingStatus) {}
}
