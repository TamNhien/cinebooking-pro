package com.cinebooking.payment;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class PaymentWebhookReceiptService {
    private final PaymentWebhookEventRepository webhooks;
    public PaymentWebhookReceiptService(PaymentWebhookEventRepository webhooks){this.webhooks=webhooks;}

    @Transactional(propagation= Propagation.REQUIRES_NEW)
    public boolean claim(UUID id,String provider,String eventKey,UUID paymentId,String payloadHash,boolean signatureValid,String resultCode,Instant receivedAt){
        return webhooks.claim(id,provider,eventKey,paymentId,payloadHash,signatureValid,resultCode,receivedAt)==1;
    }
}
