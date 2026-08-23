package com.cinebooking.payment;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;import java.util.Map;import java.util.UUID;
import static com.cinebooking.payment.PaymentDtos.*;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentService service; public PaymentController(PaymentService service){this.service=service;}

    @PostMapping("/bookings/{bookingId}/start")
    public PaymentStartResponse start(@PathVariable UUID bookingId,@Valid @RequestBody StartPaymentRequest req,@RequestHeader(value="Idempotency-Key",required=false) String idempotencyKey,Authentication auth,HttpServletRequest request) {
        return service.start(bookingId,auth.getName(),req.provider(),ip(request),idempotencyKey);
    }
    @PostMapping("/{paymentId}/retry")
    public PaymentStartResponse retry(@PathVariable UUID paymentId,@Valid @RequestBody RetryPaymentRequest req,@RequestHeader(value="Idempotency-Key",required=false) String idempotencyKey,Authentication auth,HttpServletRequest request){return service.retry(paymentId,auth.getName(),req.provider(),ip(request),idempotencyKey);}
    @PostMapping("/{paymentId}/cancel") public PaymentResultResponse cancel(@PathVariable UUID paymentId,Authentication auth){return service.cancel(paymentId,auth.getName());}
    @GetMapping("/{paymentId}/checkout") public PaymentCheckoutResponse checkout(@PathVariable UUID paymentId,Authentication auth){return service.checkout(paymentId,auth.getName());}
    @GetMapping("/{paymentId}/timeline") public List<PaymentEventItem> timeline(@PathVariable UUID paymentId,Authentication auth){return service.timeline(paymentId,auth.getName());}
    @GetMapping("/history") public List<PaymentHistoryItem> history(Authentication auth){return service.history(auth.getName());}
    @GetMapping("/providers") public List<ProviderAvailability> providers(){return service.providers();}
    @PostMapping("/bookings/{bookingId}/mock/success") public PaymentResultResponse mockSuccess(@PathVariable UUID bookingId, Authentication auth){return service.mockSuccess(bookingId,auth.getName());}
    @PostMapping("/bookings/{bookingId}/mock/fail") public PaymentResultResponse mockFail(@PathVariable UUID bookingId, Authentication auth){return service.mockFail(bookingId,auth.getName());}

    @GetMapping("/vnpay/ipn") public Map<String,String> vnpayIpn(@RequestParam Map<String,String> params){return service.vnPayIpn(params);}
    @GetMapping("/vnpay/return") public PaymentReturnResponse vnpayReturn(@RequestParam Map<String,String> params){return service.vnPayReturn(params);}
    @PostMapping("/momo/ipn") public Map<String,Object> momoIpn(@RequestBody Map<String,Object> body){return service.momoIpn(body);}
    @PostMapping("/momo/return") public PaymentReturnResponse momoReturn(@RequestBody Map<String,Object> body){return service.momoReturn(body);}

    private String ip(HttpServletRequest request){String x=request.getHeader("X-Forwarded-For");return x==null||x.isBlank()?request.getRemoteAddr():x.split(",")[0].trim();}
}
