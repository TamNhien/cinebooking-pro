package com.cinebooking.booking;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AdminBookingDtos {
    private AdminBookingDtos() {}

    public record PaymentView(UUID id, String provider, String status, BigDecimal amount,
                              String providerTransactionId, Instant createdAt, Instant paidAt) {}

    public record AuditView(UUID id, String actorEmail, String action, String details,
                            String ipAddress, Instant createdAt) {}

    public record BookingAdminView(
            UUID id,
            UUID userId,
            String customerName,
            String customerEmail,
            String customerPhone,
            UUID showtimeId,
            String movieTitle,
            String cinemaName,
            String cinemaAddress,
            String auditoriumName,
            Instant showtimeStart,
            String status,
            BigDecimal totalAmount,
            BigDecimal seatAmount,
            BigDecimal concessionAmount,
            BigDecimal discountAmount,
            int pointsRedeemed,
            String voucherCode,
            Instant expiresAt,
            Instant createdAt,
            Instant confirmedAt,
            Instant checkedInAt,
            String checkedInByEmail,
            Instant refundRequestedAt,
            Instant refundedAt,
            BigDecimal refundAmount,
            String refundReason,
            List<BookingDtos.BookingSeatResponse> seats,
            List<BookingDtos.BookingConcessionResponse> concessions,
            PaymentView latestPayment,
            List<PaymentView> payments,
            List<AuditView> timeline
    ) {}

    public record ActionRequest(String reason, String providerReference) {}
    public record ActionResult(String message, BookingAdminView booking) {}
    public record TicketAdminView(UUID bookingId, String qrPayload, String qrUrl, String qrImageDataUrl) {}
}
