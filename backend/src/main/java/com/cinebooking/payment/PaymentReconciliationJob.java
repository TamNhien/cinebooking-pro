package com.cinebooking.payment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PaymentReconciliationJob {
    private final AdminPaymentService service;private final boolean enabled;
    public PaymentReconciliationJob(AdminPaymentService service,@Value("${app.payment.reconcile.auto-enabled:false}") boolean enabled){this.service=service;this.enabled=enabled;}
    @Scheduled(fixedDelayString="${app.payment.reconcile.scan-ms:60000}")
    public void reconcileDue(){if(enabled)service.reconcileDue("SYSTEM","127.0.0.1","AUTO");}
}
