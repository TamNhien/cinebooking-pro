package com.cinebooking.payment;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

import static com.cinebooking.payment.PaymentResilienceDtos.*;

@RestController
@RequestMapping("/api/admin/payment-resilience")
public class AdminPaymentResilienceController {
    private final PaymentResilienceService resilience;
    private final PaymentWebhookRecoveryService recovery;
    private final AdminPaymentService payments;
    public AdminPaymentResilienceController(PaymentResilienceService resilience,PaymentWebhookRecoveryService recovery,AdminPaymentService payments){this.resilience=resilience;this.recovery=recovery;this.payments=payments;}

    @GetMapping("/summary") public PaymentResilienceSummary summary(){return resilience.summary();}
    @PostMapping("/webhooks/{id}/recover") public WebhookRecoveryResult recover(@PathVariable UUID id,Authentication auth,HttpServletRequest request){return recovery.recover(id,auth.getName(),ip(request),"MANUAL_WEBHOOK_RECOVERY");}
    @PostMapping("/recover-due") public WebhookRecoveryBatchResult recoverDue(Authentication auth,HttpServletRequest request){return recovery.recoverDue(auth.getName(),ip(request),"MANUAL_WEBHOOK_BATCH");}
    @PostMapping("/reconcile-due") public AdminPaymentDtos.BatchReconciliationResult reconcileDue(Authentication auth,HttpServletRequest request){return payments.reconcileDue(auth.getName(),ip(request),"MANUAL_V67_BATCH");}
    private String ip(HttpServletRequest r){String x=r.getHeader("X-Forwarded-For");return x==null||x.isBlank()?r.getRemoteAddr():x.split(",")[0].trim();}
}
