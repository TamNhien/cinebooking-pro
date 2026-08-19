package com.cinebooking.booking;

import com.cinebooking.audit.AuditService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.ShowtimeRepository;
import com.cinebooking.notification.NotificationService;
import com.cinebooking.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import static com.cinebooking.booking.BookingDtos.*;

@Service
public class TicketTransferService {
    private final BookingRepository bookings;
    private final UserRepository users;
    private final ShowtimeRepository showtimes;
    private final NotificationService notifications;
    private final AuditService audit;
    private final long cutoffMinutes;
    private final int maxTransfers;

    public TicketTransferService(BookingRepository bookings,
                                 UserRepository users,
                                 ShowtimeRepository showtimes,
                                 NotificationService notifications,
                                 AuditService audit,
                                 @Value("${app.ticket.transfer-cutoff-minutes:60}") long cutoffMinutes,
                                 @Value("${app.ticket.max-transfers:1}") int maxTransfers) {
        this.bookings = bookings;
        this.users = users;
        this.showtimes = showtimes;
        this.notifications = notifications;
        this.audit = audit;
        this.cutoffMinutes = Math.max(0, cutoffMinutes);
        this.maxTransfers = Math.max(1, maxTransfers);
    }

    public TicketTransferEligibility eligibility(UUID bookingId, String email) {
        AppUser owner = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Không tìm thấy tài khoản"));
        Booking booking = bookings.findById(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy booking"));
        if (!booking.getUserId().equals(owner.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Không có quyền chuyển vé này");
        }
        Showtime showtime = showtimes.findById(booking.getShowtimeId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy suất chiếu"));
        return eligibilityFor(booking, showtime, Instant.now());
    }

    @Transactional
    public TicketTransferResponse transfer(UUID bookingId, String senderEmail, TransferTicketRequest request, String ip) {
        AppUser sender = users.findByEmailIgnoreCase(senderEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Không tìm thấy tài khoản"));
        Booking booking = bookings.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy booking"));
        if (!booking.getUserId().equals(sender.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Không có quyền chuyển vé này");
        }

        Showtime showtime = showtimes.findById(booking.getShowtimeId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy suất chiếu"));
        TicketTransferEligibility eligibility = eligibilityFor(booking, showtime, Instant.now());
        if (!eligibility.allowed()) {
            throw new ApiException(HttpStatus.CONFLICT, eligibility.reason());
        }

        String recipientEmail = normalizeEmail(request.recipientEmail());
        if (recipientEmail.equalsIgnoreCase(sender.getEmail())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể chuyển vé cho chính tài khoản đang sở hữu vé");
        }
        AppUser recipient = users.findByEmailIgnoreCase(recipientEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Người nhận chưa có tài khoản CineBooking"));
        if (!recipient.isAccountEnabled()) {
            throw new ApiException(HttpStatus.CONFLICT, "Tài khoản người nhận đang bị vô hiệu hóa");
        }
        if (recipient.getRole() != Role.USER) {
            throw new ApiException(HttpStatus.CONFLICT, "Chỉ có thể chuyển vé cho tài khoản khách hàng CineBooking");
        }

        Instant now = Instant.now();
        booking.setTransferredFromUserId(sender.getId());
        booking.setTransferredAt(now);
        booking.setTransferCount((booking.getTransferCount() == null ? 0 : booking.getTransferCount()) + 1);
        booking.setTicketVersion((booking.getTicketVersion() == null ? 1 : booking.getTicketVersion()) + 1);
        booking.setUserId(recipient.getId());
        bookings.save(booking);

        String title = "Bạn nhận được vé CineBooking";
        String message = "Bạn vừa nhận vé booking " + booking.getId() + ". QR mới đã sẵn sàng trong Ví vé của bạn.";
        notifications.create(recipient.getId(), "BOOKING_TRANSFER_RECEIVED", title, message, "/ticket/" + booking.getId());
        notifications.create(sender.getId(), "BOOKING_TRANSFER_SENT", "Đã chuyển vé thành công",
                "Booking " + booking.getId() + " đã được chuyển cho " + recipient.getEmail() + ". QR cũ của bạn không còn hiệu lực.", "/bookings");
        audit.record(senderEmail, "TICKET_TRANSFER", "BOOKING", booking.getId().toString(),
                "recipient=" + recipient.getEmail() + ";ticketVersion=" + booking.getTicketVersion(), ip);

        return new TicketTransferResponse(booking.getId(), recipient.getEmail(), now,
                booking.getTicketVersion(), "Đã chuyển vé. QR cũ đã bị vô hiệu hóa và người nhận có thể mở QR mới trong tài khoản của họ.");
    }

    private TicketTransferEligibility eligibilityFor(Booking booking, Showtime showtime, Instant now) {
        Instant cutoffAt = showtime.getStartTime().minusSeconds(cutoffMinutes * 60);
        if (booking.getStatus() != BookingStatus.CONFIRMED)
            return denied("Chỉ vé CONFIRMED mới có thể chuyển", cutoffAt, booking);
        if (booking.getCheckedInAt() != null)
            return denied("Vé đã check-in nên không thể chuyển", cutoffAt, booking);
        if (booking.getRefundRequestedAt() != null || booking.getRefundedAt() != null)
            return denied("Vé đang hoặc đã qua quy trình hoàn tiền nên không thể chuyển", cutoffAt, booking);
        if (!now.isBefore(cutoffAt))
            return denied("Chỉ có thể chuyển vé trước giờ chiếu ít nhất " + cutoffMinutes + " phút", cutoffAt, booking);
        int count = booking.getTransferCount() == null ? 0 : booking.getTransferCount();
        if (count >= maxTransfers)
            return denied("Vé này đã đạt giới hạn chuyển vé", cutoffAt, booking);
        return new TicketTransferEligibility(true, "Có thể chuyển vé", cutoffAt, count, maxTransfers);
    }

    private TicketTransferEligibility denied(String reason, Instant cutoffAt, Booking booking) {
        int count = booking.getTransferCount() == null ? 0 : booking.getTransferCount();
        return new TicketTransferEligibility(false, reason, cutoffAt, count, maxTransfers);
    }

    private String normalizeEmail(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
