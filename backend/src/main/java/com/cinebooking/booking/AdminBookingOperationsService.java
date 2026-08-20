package com.cinebooking.booking;

import com.cinebooking.audit.*;
import com.cinebooking.commerce.CommerceService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.*;
import com.cinebooking.operations.CheckInService;
import com.cinebooking.operations.RefundService;
import com.cinebooking.payment.PaymentRepository;
import com.cinebooking.seat.SeatRepository;
import com.cinebooking.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;

import static com.cinebooking.booking.AdminBookingDtos.*;
import static com.cinebooking.booking.BookingDtos.*;

@Service
public class AdminBookingOperationsService {
    private final BookingRepository bookings;
    private final BookingService bookingService;
    private final BookingSeatRepository bookingSeats;
    private final ShowtimeRepository showtimes;
    private final MovieRepository movies;
    private final AuditoriumRepository auditoriums;
    private final CinemaRepository cinemas;
    private final SeatRepository seats;
    private final UserRepository users;
    private final PaymentRepository payments;
    private final CommerceService commerce;
    private final AuditLogRepository auditLogs;
    private final AuditService audit;
    private final RefundService refunds;
    private final CheckInService checkIn;
    private final AdminTicketMailService ticketMail;

    public AdminBookingOperationsService(BookingRepository bookings, BookingService bookingService,
                                         BookingSeatRepository bookingSeats, ShowtimeRepository showtimes,
                                         MovieRepository movies, AuditoriumRepository auditoriums,
                                         CinemaRepository cinemas, SeatRepository seats, UserRepository users,
                                         PaymentRepository payments, CommerceService commerce,
                                         AuditLogRepository auditLogs, AuditService audit,
                                         RefundService refunds, CheckInService checkIn,
                                         AdminTicketMailService ticketMail) {
        this.bookings=bookings; this.bookingService=bookingService; this.bookingSeats=bookingSeats;
        this.showtimes=showtimes; this.movies=movies; this.auditoriums=auditoriums; this.cinemas=cinemas;
        this.seats=seats; this.users=users; this.payments=payments; this.commerce=commerce;
        this.auditLogs=auditLogs; this.audit=audit; this.refunds=refunds; this.checkIn=checkIn; this.ticketMail=ticketMail;
    }

    public List<BookingAdminView> list() {
        return bookings.findAll().stream()
                .sorted(Comparator.comparing(Booking::getCreatedAt).reversed())
                .map(b -> view(b, false)).toList();
    }

    public BookingAdminView detail(UUID id) {
        Booking b = bookings.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy booking"));
        return view(b, true);
    }

    @Transactional
    public ActionResult cancel(UUID id, String reason, String adminEmail, String ip) {
        Booking b = bookings.findByIdForUpdate(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy booking"));
        if (b.getStatus() != BookingStatus.PENDING) {
            throw new ApiException(HttpStatus.CONFLICT, "Chỉ booking PENDING mới được huỷ trực tiếp. Booking đã thanh toán phải dùng quy trình hoàn tiền.");
        }
        bookingService.cancelPending(id, BookingStatus.CANCELLED);
        String details = "Admin huỷ booking" + (reason == null || reason.isBlank() ? "" : ": " + reason.trim());
        audit.record(adminEmail, "BOOKING_CANCEL_ADMIN", "BOOKING", id.toString(), details, ip);
        return new ActionResult("Đã huỷ booking và mở lại ghế.", detail(id));
    }

    @Transactional
    public ActionResult requestRefund(UUID id, String reason, String adminEmail, String ip) {
        refunds.adminRequest(id, adminEmail, reason, ip);
        return new ActionResult("Đã tạo yêu cầu hoàn tiền.", detail(id));
    }

    @Transactional
    public ActionResult approveRefund(UUID id, String providerReference, String adminEmail, String ip) {
        refunds.approve(id, adminEmail, providerReference, ip);
        return new ActionResult("Đã duyệt hoàn tiền và mở lại ghế.", detail(id));
    }

    @Transactional
    public ActionResult rejectRefund(UUID id, String adminEmail, String ip) {
        refunds.reject(id, adminEmail, ip);
        return new ActionResult("Đã từ chối yêu cầu hoàn tiền.", detail(id));
    }

    @Transactional
    public ActionResult manualCheckIn(UUID id, String adminEmail, String ip) {
        checkIn.adminManualCheckIn(id, adminEmail, ip);
        return new ActionResult("Check-in thủ công thành công.", detail(id));
    }

    public ActionResult resendTicket(UUID id, String adminEmail, String ip) {
        String email = ticketMail.resend(id);
        audit.record(adminEmail, "TICKET_RESEND_EMAIL", "BOOKING", id.toString(), "to=" + email, ip);
        return new ActionResult("Đã gửi lại vé tới " + email + ".", detail(id));
    }

    private BookingAdminView view(Booking b, boolean withTimeline) {
        AppUser user = users.findById(b.getUserId()).orElse(null);
        Showtime st = showtimes.findById(b.getShowtimeId()).orElse(null);
        Movie movie = st == null ? null : movies.findById(st.getMovieId()).orElse(null);
        Auditorium aud = st == null ? null : auditoriums.findById(st.getAuditoriumId()).orElse(null);
        Cinema cinema = aud == null ? null : cinemas.findById(aud.getCinemaId()).orElse(null);

        List<BookingSeat> seatRows = bookingSeats.findByBookingId(b.getId());
        Map<UUID, Seat> seatMap = new HashMap<>();
        seats.findAllById(seatRows.stream().map(BookingSeat::getSeatId).toList()).forEach(s -> seatMap.put(s.getId(), s));
        List<BookingSeatResponse> seatDtos = seatRows.stream().map(bs -> {
            Seat s = seatMap.get(bs.getSeatId());
            return new BookingSeatResponse(bs.getSeatId(), s == null ? "?" : s.getRowLabel()+s.getSeatNumber(), bs.getPrice());
        }).toList();
        List<BookingConcessionResponse> concessionDtos = commerce.bookingItems(b.getId()).stream()
                .map(x -> new BookingConcessionResponse(x.getProductId(), x.getProductName(), x.getUnitPrice(), x.getQuantity(), x.getSubtotal()))
                .toList();
        List<PaymentView> paymentViews = payments.findByBookingIdOrderByCreatedAtDesc(b.getId()).stream().map(p ->
                new PaymentView(p.getId(), p.getProvider(), p.getStatus().name(), p.getAmount(), p.getProviderTransactionId(), p.getCreatedAt(), p.getPaidAt())
        ).toList();
        PaymentView latest = paymentViews.isEmpty() ? null : paymentViews.get(0);
        String checkedBy = b.getCheckedInBy() == null ? null : users.findById(b.getCheckedInBy()).map(AppUser::getEmail).orElse(null);
        List<AuditView> timeline = withTimeline ? auditLogs.findTop100ByEntityTypeAndEntityIdOrderByCreatedAtDesc("BOOKING", b.getId().toString()).stream()
                .map(x -> new AuditView(x.getId(), x.getActorEmail(), x.getAction(), x.getDetails(), x.getIpAddress(), x.getCreatedAt())).toList() : List.of();

        return new BookingAdminView(
                b.getId(), b.getUserId(), user == null ? "-" : user.getFullName(), user == null ? "-" : user.getEmail(), user == null ? null : user.getPhone(),
                b.getShowtimeId(), movie == null ? "-" : movie.getTitle(), cinema == null ? "-" : cinema.getName(), cinema == null ? "-" : cinema.getAddress(),
                aud == null ? "-" : aud.getName(), st == null ? null : st.getStartTime(), b.getStatus().name(), nz(b.getTotalAmount()), nz(b.getSeatAmount()),
                nz(b.getConcessionAmount()), nz(b.getDiscountAmount()), b.getPointsRedeemed()==null?0:b.getPointsRedeemed(), b.getVoucherCode(), b.getExpiresAt(),
                b.getCreatedAt(), b.getConfirmedAt(), b.getCheckedInAt(), checkedBy, b.getRefundRequestedAt(), b.getRefundedAt(), b.getRefundAmount(), b.getRefundReason(),
                seatDtos, concessionDtos, latest, paymentViews, timeline);
    }

    private BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}
