package com.cinebooking.payment;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import static com.cinebooking.payment.AdminPaymentDtos.*;

@RestController
@RequestMapping("/api/admin/payments")
public class AdminPaymentController {
    private final AdminPaymentService service;public AdminPaymentController(AdminPaymentService service){this.service=service;}
    @GetMapping public PaymentOpsDashboard dashboard(){return service.dashboard();}
    @PostMapping("/{id}/reconcile") public ReconciliationResult reconcile(@PathVariable UUID id,Authentication auth,HttpServletRequest request){return service.reconcile(id,auth.getName(),ip(request));}
    private String ip(HttpServletRequest r){String x=r.getHeader("X-Forwarded-For");return x==null||x.isBlank()?r.getRemoteAddr():x.split(",")[0].trim();}
}
