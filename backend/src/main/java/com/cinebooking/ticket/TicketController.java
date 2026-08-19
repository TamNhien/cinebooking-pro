package com.cinebooking.ticket;

import com.cinebooking.booking.BookingService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.Booking;
import com.cinebooking.domain.BookingStatus;
import com.cinebooking.operations.TicketTokenService;
import com.cinebooking.user.UserRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.qrcode.QRCodeWriter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {
    private final BookingService bookings; private final UserRepository users; private final TicketTokenService tokens; private final String configuredPublicBaseUrl;
    public TicketController(BookingService bookings, UserRepository users,TicketTokenService tokens,@Value("${app.ticket.public-base-url:}") String publicBaseUrl){this.bookings=bookings;this.users=users;this.tokens=tokens;this.configuredPublicBaseUrl=publicBaseUrl==null?"":publicBaseUrl.trim();}

    @GetMapping("/{bookingId}")
    public Map<String,Object> ticket(@PathVariable UUID bookingId, Authentication auth,HttpServletRequest request) {
        Booking b = authorized(bookingId, auth); String raw=payload(b); String url=checkInUrl(raw,request);
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("bookingId",b.getId()); result.put("status",b.getStatus()); result.put("checkedIn",b.getCheckedInAt()!=null); result.put("checkedInAt",b.getCheckedInAt()==null?"":b.getCheckedInAt().toString()); result.put("qrPayload",raw); result.put("qrUrl",url); result.put("publicBaseUrl",baseUrl(request));
        return result;
    }

    @GetMapping(value="/{bookingId}/qr", produces=MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> qr(@PathVariable UUID bookingId, Authentication auth,HttpServletRequest request) throws Exception {
        Booking b = authorized(bookingId, auth);
        // V11 QR stores an absolute URL. A phone's normal camera can open it directly.
        var matrix = new QRCodeWriter().encode(checkInUrl(payload(b),request), BarcodeFormat.QR_CODE, 420, 420);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(matrix,"PNG",out);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.IMAGE_PNG).body(out.toByteArray());
    }

    private Booking authorized(UUID id, Authentication auth) {
        Booking b = bookings.entity(id);
        UUID userId = users.findByEmailIgnoreCase(auth.getName()).orElseThrow().getId();
        if (!b.getUserId().equals(userId)) throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền xem vé");
        if (b.getStatus()!= BookingStatus.CONFIRMED) throw new ApiException(HttpStatus.CONFLICT,"Vé chỉ khả dụng khi booking đã thanh toán và chưa hoàn tiền");
        return b;
    }
    private String payload(Booking b){ return tokens.create(b.getId(),b.getShowtimeId(),b.getTicketVersion()==null?1:b.getTicketVersion()); }
    private String checkInUrl(String raw,HttpServletRequest request){return baseUrl(request)+"/staff/check-in?ticket="+URLEncoder.encode(raw,StandardCharsets.UTF_8);}
    private String baseUrl(HttpServletRequest request){
        if(!configuredPublicBaseUrl.isBlank())return trimSlash(configuredPublicBaseUrl);
        String proto=headerOr(request,"X-Forwarded-Proto",request.getScheme());
        String host=headerOr(request,"X-Forwarded-Host",request.getHeader("Host"));
        if(host==null||host.isBlank())host=request.getServerName()+((request.getServerPort()==80||request.getServerPort()==443)?"":":"+request.getServerPort());
        return trimSlash(proto+"://"+host);
    }
    private String headerOr(HttpServletRequest r,String name,String fallback){String v=r.getHeader(name);if(v==null||v.isBlank())return fallback;return v.split(",")[0].trim();}
    private String trimSlash(String v){String s=v.trim();while(s.endsWith("/"))s=s.substring(0,s.length()-1);return s;}
}
