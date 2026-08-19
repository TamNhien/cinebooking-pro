package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="payment_webhook_event")
public class PaymentWebhookEvent {
    @Id private UUID id;
    @Column(nullable=false) private String provider;
    @Column(name="event_key",nullable=false) private String eventKey;
    @Column(name="payment_id") private UUID paymentId;
    @Column(name="payload_hash",nullable=false) private String payloadHash;
    @Column(name="signature_valid",nullable=false) private boolean signatureValid;
    @Column(name="result_code") private String resultCode;
    @Column(name="response_code") private String responseCode;
    @Column(name="response_message") private String responseMessage;
    @Column(name="received_at",nullable=false) private Instant receivedAt;
    @Column(name="processed_at") private Instant processedAt;

    @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(receivedAt==null)receivedAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID id){this.id=id;}
    public String getProvider(){return provider;} public void setProvider(String provider){this.provider=provider;}
    public String getEventKey(){return eventKey;} public void setEventKey(String eventKey){this.eventKey=eventKey;}
    public UUID getPaymentId(){return paymentId;} public void setPaymentId(UUID paymentId){this.paymentId=paymentId;}
    public String getPayloadHash(){return payloadHash;} public void setPayloadHash(String payloadHash){this.payloadHash=payloadHash;}
    public boolean isSignatureValid(){return signatureValid;} public void setSignatureValid(boolean signatureValid){this.signatureValid=signatureValid;}
    public String getResultCode(){return resultCode;} public void setResultCode(String resultCode){this.resultCode=resultCode;}
    public String getResponseCode(){return responseCode;} public void setResponseCode(String responseCode){this.responseCode=responseCode;}
    public String getResponseMessage(){return responseMessage;} public void setResponseMessage(String responseMessage){this.responseMessage=responseMessage;}
    public Instant getReceivedAt(){return receivedAt;} public void setReceivedAt(Instant receivedAt){this.receivedAt=receivedAt;}
    public Instant getProcessedAt(){return processedAt;} public void setProcessedAt(Instant processedAt){this.processedAt=processedAt;}
}
