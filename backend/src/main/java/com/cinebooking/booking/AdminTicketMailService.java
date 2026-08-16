package com.cinebooking.booking;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.*;
import com.cinebooking.user.UserRepository;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

import java.nio.charset.StandardCharsets;

@Service
public class AdminTicketMailService {
    private final BookingRepository bookings;
    private final UserRepository users;
    private final ShowtimeRepository showtimes;
    private final MovieRepository movies;
    private final AuditoriumRepository auditoriums;
    private final CinemaRepository cinemas;
    private final JavaMailSender mailSender;

    @Value("${app.frontend-url}") private String frontendUrl;
    @Value("${app.ticket.public-base-url:}") private String ticketPublicBaseUrl;
    @Value("${app.mail.enabled:false}") private boolean mailEnabled;
    @Value("${app.mail.from:no-reply@cinebooking.local}") private String mailFrom;

    public AdminTicketMailService(BookingRepository bookings, UserRepository users,
                                  ShowtimeRepository showtimes, MovieRepository movies,
                                  AuditoriumRepository auditoriums, CinemaRepository cinemas,
                                  ObjectProvider<JavaMailSender> mailSender) {
        this.bookings = bookings;
        this.users = users;
        this.showtimes = showtimes;
        this.movies = movies;
        this.auditoriums = auditoriums;
        this.cinemas = cinemas;
        this.mailSender = mailSender.getIfAvailable();
    }

    public String resend(java.util.UUID bookingId) {
        if (!mailEnabled || mailSender == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Dịch vụ email chưa được bật hoặc chưa cấu hình SMTP");
        }
        Booking b = bookings.findById(bookingId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy booking"));
        if (b.getStatus() != BookingStatus.CONFIRMED) {
            throw new ApiException(HttpStatus.CONFLICT, "Chỉ có thể gửi lại vé cho booking CONFIRMED");
        }
        AppUser user = users.findById(b.getUserId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy khách hàng"));
        Showtime st = showtimes.findById(b.getShowtimeId()).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy suất chiếu"));
        Movie movie = movies.findById(st.getMovieId()).orElseThrow();
        Auditorium aud = auditoriums.findById(st.getAuditoriumId()).orElseThrow();
        Cinema cinema = cinemas.findById(aud.getCinemaId()).orElseThrow();
        String base = ticketPublicBaseUrl == null || ticketPublicBaseUrl.isBlank() ? frontendUrl : ticketPublicBaseUrl;
        String ticketUrl = base.replaceAll("/$", "") + "/ticket/" + b.getId();
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, false, StandardCharsets.UTF_8.name());
            helper.setFrom(mailFrom);
            helper.setTo(user.getEmail());
            helper.setSubject("CineBooking - Vé xem phim " + movie.getTitle());
            String html = """
                    <!doctype html><html lang="vi"><body style="margin:0;background:#0f172a;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0">
                    <div style="max-width:620px;margin:32px auto;padding:0 16px"><div style="background:#111827;border:1px solid #334155;border-radius:18px;padding:28px">
                    <div style="font-size:20px;font-weight:800;color:#fb7185;margin-bottom:18px">CineBooking Pro</div>
                    <h1 style="font-size:24px;margin:0 0 14px;color:#fff">Vé xem phim của bạn</h1>
                    <p>Xin chào <strong>%s</strong>, Admin vừa gửi lại vé cho booking <strong>%s</strong>.</p>
                    <table style="width:100%%;border-collapse:collapse;margin:20px 0;color:#e2e8f0">
                    <tr><td style="padding:7px 0;color:#94a3b8">Phim</td><td style="padding:7px 0;text-align:right">%s</td></tr>
                    <tr><td style="padding:7px 0;color:#94a3b8">Rạp</td><td style="padding:7px 0;text-align:right">%s</td></tr>
                    <tr><td style="padding:7px 0;color:#94a3b8">Phòng</td><td style="padding:7px 0;text-align:right">%s</td></tr>
                    <tr><td style="padding:7px 0;color:#94a3b8">Suất chiếu</td><td style="padding:7px 0;text-align:right">%s</td></tr>
                    </table>
                    <p style="margin:26px 0"><a href="%s" style="display:inline-block;background:#f43f5e;color:white;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:10px">Mở QR vé</a></p>
                    <p style="font-size:13px;color:#94a3b8">Nếu nút không hoạt động, hãy mở: %s</p>
                    </div></div></body></html>
                    """.formatted(
                    HtmlUtils.htmlEscape(user.getFullName()), b.getId(), HtmlUtils.htmlEscape(movie.getTitle()),
                    HtmlUtils.htmlEscape(cinema.getName()), HtmlUtils.htmlEscape(aud.getName()), st.getStartTime(),
                    HtmlUtils.htmlEscape(ticketUrl), HtmlUtils.htmlEscape(ticketUrl));
            helper.setText(html, true);
            mailSender.send(message);
            return user.getEmail();
        } catch (MailException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Không thể gửi email vé. Hãy kiểm tra cấu hình SMTP.");
        } catch (Exception e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể tạo email vé");
        }
    }
}
