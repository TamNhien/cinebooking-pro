package com.cinebooking.payment;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PaymentWebhookRecoveryJob {
    private final PaymentWebhookRecoveryService service;
    private final boolean enabled;
    public PaymentWebhookRecoveryJob(PaymentWebhookRecoveryService service,@Value("${app.payment.webhook-recovery.enabled:true}") boolean enabled){this.service=service;this.enabled=enabled;}
    @Scheduled(fixedDelayString="${app.payment.webhook-recovery.scan-ms:60000}")
    public void recoverDue(){if(enabled)service.recoverDue("SYSTEM","127.0.0.1","AUTO_WEBHOOK_RECOVERY");}
}
