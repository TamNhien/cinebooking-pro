package com.cinebooking.payment;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;import java.util.UUID;
import static com.cinebooking.payment.PaymentDtos.*;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentService service; public PaymentController(PaymentService service){this.service=service;}
    @PostMapping("/bookings/{bookingId}/start")
    public PaymentStartResponse start(@PathVariable UUID bookingId, @Valid @RequestBody StartPaymentRequest req, Authentication auth, HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For"); if (ip == null || ip.isBlank()) ip = request.getRemoteAddr(); else ip = ip.split(",")[0].trim(); return service.start(bookingId,auth.getName(),req.provider(),ip);
    }
    @GetMapping("/{paymentId}/checkout") public PaymentCheckoutResponse checkout(@PathVariable UUID paymentId,Authentication auth){return service.checkout(paymentId,auth.getName());}
    @PostMapping("/bookings/{bookingId}/mock/success") public PaymentResultResponse mockSuccess(@PathVariable UUID bookingId, Authentication auth){return service.mockSuccess(bookingId,auth.getName());}
    @PostMapping("/bookings/{bookingId}/mock/fail") public PaymentResultResponse mockFail(@PathVariable UUID bookingId, Authentication auth){return service.mockFail(bookingId,auth.getName());}
    @GetMapping("/vnpay/ipn") public Map<String,String> vnpayIpn(@RequestParam Map<String,String> params){return service.vnPayIpn(params);}
    @GetMapping("/vnpay/return") public Map<String,String> vnpayReturn(@RequestParam Map<String,String> params){return service.vnPayIpn(params);}
    @PostMapping("/momo/ipn") public Map<String,Object> momoIpn(@RequestBody Map<String,Object> body){return service.momoIpn(body);}
}
