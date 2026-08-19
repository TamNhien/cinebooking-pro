package com.cinebooking.payment;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class PaymentExpiryJob {
    private final PaymentService payments;
    public PaymentExpiryJob(PaymentService payments){this.payments=payments;}
    @Scheduled(fixedDelay = 30000)
    public void expire(){payments.expireStale();}
}
