package com.cinebooking.booking;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class BookingDtos {
    private BookingDtos() {}
    public record ConcessionItemRequest(@NotNull UUID productId, @Min(1) @Max(10) int quantity) {}
    public record CreateBookingRequest(@NotNull UUID showtimeId, @NotEmpty List<UUID> seatIds,
                                       List<@Valid ConcessionItemRequest> concessions,
                                       @Size(max=60) String voucherCode,
                                       @Min(0) Integer redeemPoints) {}
    public record BookingSeatResponse(UUID seatId, String code, BigDecimal price) {}
    public record BookingConcessionResponse(UUID productId,String name,BigDecimal unitPrice,int quantity,BigDecimal subtotal) {}
    public record TransferTicketRequest(@NotBlank @Email @Size(max=254) String recipientEmail) {}
    public record TicketTransferEligibility(boolean allowed, String reason, Instant cutoffAt, int transferCount, int maxTransfers) {}
    public record TicketTransferResponse(UUID bookingId, String recipientEmail, Instant transferredAt, int ticketVersion, String message) {}
    public record BookingResponse(UUID id, UUID showtimeId, String movieTitle, Instant showtimeStart,
                                  String status, BigDecimal totalAmount, BigDecimal seatAmount,
                                  BigDecimal concessionAmount, BigDecimal discountAmount,
                                  int pointsRedeemed, String voucherCode, Instant expiresAt,
                                  Instant createdAt, Instant confirmedAt, Instant checkedInAt,
                                  Instant refundRequestedAt, Instant refundedAt, BigDecimal refundAmount,
                                  String refundReason, List<BookingSeatResponse> seats,
                                  List<BookingConcessionResponse> concessions) {}
}
