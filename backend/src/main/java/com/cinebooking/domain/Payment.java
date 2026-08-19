package com.cinebooking.domain;
import jakarta.persistence.*; import java.math.BigDecimal; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="payment")
public class Payment {
 @Id private UUID id;
 @Column(name="booking_id",nullable=false) private UUID bookingId;
 @Column(name="payer_user_id",nullable=false) private UUID payerUserId;
 @Column(nullable=false) private String provider;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private PaymentStatus status;
 @Column(nullable=false) private BigDecimal amount;
 @Column(name="provider_transaction_id") private String providerTransactionId;
 @Column(name="provider_order_id") private String providerOrderId;
 @Column(name="merchant_request_id") private String merchantRequestId;
 @Column(name="provider_created_at") private String providerCreatedAt;
 @Column(name="client_idempotency_key") private String clientIdempotencyKey;
 @Column(name="provider_response_code") private String providerResponseCode;
 @Column(name="provider_message") private String providerMessage;
 @Column(name="checkout_url",columnDefinition="text") private String checkoutUrl;
 @Column(name="qr_payload",columnDefinition="text") private String qrPayload;
 @Column(columnDefinition="text") private String deeplink;
 @Column(name="created_at",nullable=false) private Instant createdAt;
 @Column(name="updated_at",nullable=false) private Instant updatedAt;
 @Column(name="expires_at") private Instant expiresAt;
 @Column(name="paid_at") private Instant paidAt;
 @Column(name="failed_at") private Instant failedAt;
 @Column(name="last_webhook_at") private Instant lastWebhookAt;
 @Column(name="loyalty_points_awarded",nullable=false) private Integer loyaltyPointsAwarded;
 @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(createdAt==null)createdAt=Instant.now();if(updatedAt==null)updatedAt=createdAt;if(status==null)status=PaymentStatus.PENDING;if(loyaltyPointsAwarded==null)loyaltyPointsAwarded=0;}
 @PreUpdate void update(){updatedAt=Instant.now();}
 public UUID getId(){return id;} public void setId(UUID id){this.id=id;}
 public UUID getBookingId(){return bookingId;} public void setBookingId(UUID bookingId){this.bookingId=bookingId;}
 public UUID getPayerUserId(){return payerUserId;} public void setPayerUserId(UUID payerUserId){this.payerUserId=payerUserId;}
 public String getProvider(){return provider;} public void setProvider(String provider){this.provider=provider;}
 public PaymentStatus getStatus(){return status;} public void setStatus(PaymentStatus status){this.status=status;}
 public BigDecimal getAmount(){return amount;} public void setAmount(BigDecimal amount){this.amount=amount;}
 public String getProviderTransactionId(){return providerTransactionId;} public void setProviderTransactionId(String providerTransactionId){this.providerTransactionId=providerTransactionId;}
 public String getProviderOrderId(){return providerOrderId;} public void setProviderOrderId(String providerOrderId){this.providerOrderId=providerOrderId;}
 public String getMerchantRequestId(){return merchantRequestId;} public void setMerchantRequestId(String merchantRequestId){this.merchantRequestId=merchantRequestId;}
 public String getProviderCreatedAt(){return providerCreatedAt;} public void setProviderCreatedAt(String providerCreatedAt){this.providerCreatedAt=providerCreatedAt;}
 public String getClientIdempotencyKey(){return clientIdempotencyKey;} public void setClientIdempotencyKey(String clientIdempotencyKey){this.clientIdempotencyKey=clientIdempotencyKey;}
 public String getProviderResponseCode(){return providerResponseCode;} public void setProviderResponseCode(String providerResponseCode){this.providerResponseCode=providerResponseCode;}
 public String getProviderMessage(){return providerMessage;} public void setProviderMessage(String providerMessage){this.providerMessage=providerMessage;}
 public String getCheckoutUrl(){return checkoutUrl;} public void setCheckoutUrl(String checkoutUrl){this.checkoutUrl=checkoutUrl;}
 public String getQrPayload(){return qrPayload;} public void setQrPayload(String qrPayload){this.qrPayload=qrPayload;}
 public String getDeeplink(){return deeplink;} public void setDeeplink(String deeplink){this.deeplink=deeplink;}
 public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant createdAt){this.createdAt=createdAt;}
 public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant updatedAt){this.updatedAt=updatedAt;}
 public Instant getExpiresAt(){return expiresAt;} public void setExpiresAt(Instant expiresAt){this.expiresAt=expiresAt;}
 public Instant getPaidAt(){return paidAt;} public void setPaidAt(Instant paidAt){this.paidAt=paidAt;}
 public Instant getFailedAt(){return failedAt;} public void setFailedAt(Instant failedAt){this.failedAt=failedAt;}
 public Instant getLastWebhookAt(){return lastWebhookAt;} public void setLastWebhookAt(Instant lastWebhookAt){this.lastWebhookAt=lastWebhookAt;}
 public Integer getLoyaltyPointsAwarded(){return loyaltyPointsAwarded;} public void setLoyaltyPointsAwarded(Integer loyaltyPointsAwarded){this.loyaltyPointsAwarded=loyaltyPointsAwarded;}
}
