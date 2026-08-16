package com.cinebooking.booking;

import com.cinebooking.audit.AuditService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.Booking;
import com.cinebooking.domain.BookingStatus;
import com.cinebooking.operations.TicketTokenService;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

import static com.cinebooking.booking.AdminBookingDtos.*;

@RestController
@RequestMapping("/api/admin/booking-ops")
public class AdminBookingOperationsController {
    private final AdminBookingOperationsService service;
    private final BookingService bookings;
    private final TicketTokenService tokens;
    private final AuditService audit;
    private final String configuredPublicBaseUrl;

    public AdminBookingOperationsController(AdminBookingOperationsService service, BookingService bookings,
                                            TicketTokenService tokens, AuditService audit,
                                            @Value("${app.ticket.public-base-url:}") String publicBaseUrl) {
        this.service=service; this.bookings=bookings; this.tokens=tokens; this.audit=audit;
        this.configuredPublicBaseUrl=publicBaseUrl==null?"":publicBaseUrl.trim();
    }

    @GetMapping public List<BookingAdminView> list(){ return service.list(); }
    @GetMapping("/{id}") public BookingAdminView detail(@PathVariable UUID id){ return service.detail(id); }

    @PostMapping("/{id}/cancel")
    public ActionResult cancel(@PathVariable UUID id, @RequestBody(required=false) ActionRequest body,
                               Authentication auth, HttpServletRequest req) {
        return service.cancel(id, body==null?null:body.reason(), auth.getName(), ip(req));
    }

    @PostMapping("/{id}/refund-request")
    public ActionResult requestRefund(@PathVariable UUID id, @RequestBody(required=false) ActionRequest body,
                                      Authentication auth, HttpServletRequest req) {
        return service.requestRefund(id, body==null?null:body.reason(), auth.getName(), ip(req));
    }

    @PostMapping("/{id}/refund-approve")
    public ActionResult approveRefund(@PathVariable UUID id, Authentication auth, HttpServletRequest req) {
        return service.approveRefund(id, auth.getName(), ip(req));
    }

    @PostMapping("/{id}/refund-reject")
    public ActionResult rejectRefund(@PathVariable UUID id, Authentication auth, HttpServletRequest req) {
        return service.rejectRefund(id, auth.getName(), ip(req));
    }

    @PostMapping("/{id}/manual-checkin")
    public ActionResult manualCheckIn(@PathVariable UUID id, Authentication auth, HttpServletRequest req) {
        return service.manualCheckIn(id, auth.getName(), ip(req));
    }

    @PostMapping("/{id}/resend-ticket")
    public ActionResult resendTicket(@PathVariable UUID id, Authentication auth, HttpServletRequest req) {
        return service.resendTicket(id, auth.getName(), ip(req));
    }

    @GetMapping("/{id}/ticket")
    public TicketAdminView ticket(@PathVariable UUID id, Authentication auth, HttpServletRequest request) throws Exception {
        Booking b = bookings.entity(id);
        if (b.getStatus() != BookingStatus.CONFIRMED) throw new ApiException(HttpStatus.CONFLICT, "QR chỉ khả dụng cho booking CONFIRMED");
        String raw = tokens.create(b.getId(), b.getShowtimeId());
        String url = baseUrl(request)+"/staff/check-in?ticket="+ URLEncoder.encode(raw, StandardCharsets.UTF_8);
        var matrix = new QRCodeWriter().encode(url, BarcodeFormat.QR_CODE, 420, 420);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(matrix, "PNG", out);
        audit.record(auth.getName(), "TICKET_VIEW_ADMIN", "BOOKING", id.toString(), "Admin mở QR vé", ip(request));
        return new TicketAdminView(id, raw, url, "data:image/png;base64,"+ Base64.getEncoder().encodeToString(out.toByteArray()));
    }

    private String baseUrl(HttpServletRequest request){
        if(!configuredPublicBaseUrl.isBlank()) return trimSlash(configuredPublicBaseUrl);
        String proto=headerOr(request,"X-Forwarded-Proto",request.getScheme());
        String host=headerOr(request,"X-Forwarded-Host",request.getHeader("Host"));
        if(host==null||host.isBlank())host=request.getServerName()+((request.getServerPort()==80||request.getServerPort()==443)?"":":"+request.getServerPort());
        return trimSlash(proto+"://"+host);
    }
    private String headerOr(HttpServletRequest r,String name,String fallback){String v=r.getHeader(name);if(v==null||v.isBlank())return fallback;return v.split(",")[0].trim();}
    private String trimSlash(String v){String s=v.trim();while(s.endsWith("/"))s=s.substring(0,s.length()-1);return s;}
    private String ip(HttpServletRequest r){String x=r.getHeader("X-Forwarded-For");return x==null||x.isBlank()?r.getRemoteAddr():x.split(",")[0].trim();}
}
