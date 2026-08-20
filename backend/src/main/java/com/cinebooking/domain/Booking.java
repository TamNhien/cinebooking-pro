package com.cinebooking.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="booking")
public class Booking {
 @Id private UUID id;
 @Column(name="user_id",nullable=false) private UUID userId;
 @Column(name="purchaser_user_id",nullable=false) private UUID purchaserUserId;
 @Column(name="showtime_id",nullable=false) private UUID showtimeId;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private BookingStatus status;
 @Column(name="total_amount",nullable=false) private BigDecimal totalAmount;
 @Column(name="seat_amount",nullable=false) private BigDecimal seatAmount;
 @Column(name="concession_amount",nullable=false) private BigDecimal concessionAmount;
 @Column(name="discount_amount",nullable=false) private BigDecimal discountAmount;
 @Column(name="points_redeemed",nullable=false) private Integer pointsRedeemed;
 @Column(name="voucher_code") private String voucherCode;
 @Column(name="benefits_refunded",nullable=false) private Boolean benefitsRefunded;
 @Column(name="reminder_sent",nullable=false) private Boolean reminderSent;
 @Column(name="idempotency_key",length=80) private String idempotencyKey;
 @Column(name="request_fingerprint",length=64) private String requestFingerprint;
 @Column(name="expires_at") private Instant expiresAt;
 @Column(name="created_at",nullable=false) private Instant createdAt;
 @Column(name="confirmed_at") private Instant confirmedAt;
 @Column(name="checked_in_at") private Instant checkedInAt;
 @Column(name="checked_in_by") private UUID checkedInBy;
 @Column(name="refund_requested_at") private Instant refundRequestedAt;
 @Column(name="refunded_at") private Instant refundedAt;
 @Column(name="refund_amount") private BigDecimal refundAmount;
 @Column(name="refund_reason") private String refundReason;
 @Column(name="refund_rate_percent") private BigDecimal refundRatePercent;
 @Column(name="refund_fee_amount") private BigDecimal refundFeeAmount;
 @Column(name="refund_policy_code") private String refundPolicyCode;
 @Column(name="refund_automatic",nullable=false) private Boolean refundAutomatic;
 @Column(name="refund_processed_at") private Instant refundProcessedAt;
 @Column(name="refund_processed_by") private String refundProcessedBy;
 @Column(name="refund_provider_reference") private String refundProviderReference;
 @Column(name="ticket_version",nullable=false) private Integer ticketVersion;
 @Column(name="transfer_count",nullable=false) private Integer transferCount;
 @Column(name="transferred_at") private Instant transferredAt;
 @Column(name="transferred_from_user_id") private UUID transferredFromUserId;
 @PrePersist public void pre(){if(id==null)id=UUID.randomUUID(); if(createdAt==null)createdAt=Instant.now(); if(status==null)status=BookingStatus.PENDING; if(totalAmount==null)totalAmount=BigDecimal.ZERO;if(seatAmount==null)seatAmount=BigDecimal.ZERO;if(concessionAmount==null)concessionAmount=BigDecimal.ZERO;if(discountAmount==null)discountAmount=BigDecimal.ZERO;if(pointsRedeemed==null)pointsRedeemed=0;if(benefitsRefunded==null)benefitsRefunded=false;if(reminderSent==null)reminderSent=false;if(purchaserUserId==null)purchaserUserId=userId;if(ticketVersion==null)ticketVersion=1;if(transferCount==null)transferCount=0;if(refundAutomatic==null)refundAutomatic=false;}
 public UUID getId(){return id;} public void setId(UUID id){this.id=id;} public UUID getUserId(){return userId;} public void setUserId(UUID userId){this.userId=userId;} public UUID getPurchaserUserId(){return purchaserUserId;} public void setPurchaserUserId(UUID v){purchaserUserId=v;} public UUID getShowtimeId(){return showtimeId;} public void setShowtimeId(UUID showtimeId){this.showtimeId=showtimeId;} public BookingStatus getStatus(){return status;} public void setStatus(BookingStatus status){this.status=status;} public BigDecimal getTotalAmount(){return totalAmount;} public void setTotalAmount(BigDecimal totalAmount){this.totalAmount=totalAmount;} public BigDecimal getSeatAmount(){return seatAmount;} public void setSeatAmount(BigDecimal v){seatAmount=v;} public BigDecimal getConcessionAmount(){return concessionAmount;} public void setConcessionAmount(BigDecimal v){concessionAmount=v;} public BigDecimal getDiscountAmount(){return discountAmount;} public void setDiscountAmount(BigDecimal v){discountAmount=v;} public Integer getPointsRedeemed(){return pointsRedeemed;} public void setPointsRedeemed(Integer v){pointsRedeemed=v;} public String getVoucherCode(){return voucherCode;} public void setVoucherCode(String v){voucherCode=v;} public Boolean getBenefitsRefunded(){return benefitsRefunded;} public void setBenefitsRefunded(Boolean v){benefitsRefunded=v;} public Boolean getReminderSent(){return reminderSent;} public void setReminderSent(Boolean v){reminderSent=v;} public String getIdempotencyKey(){return idempotencyKey;} public void setIdempotencyKey(String v){idempotencyKey=v;} public String getRequestFingerprint(){return requestFingerprint;} public void setRequestFingerprint(String v){requestFingerprint=v;} public Instant getExpiresAt(){return expiresAt;} public void setExpiresAt(Instant expiresAt){this.expiresAt=expiresAt;} public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant createdAt){this.createdAt=createdAt;} public Instant getConfirmedAt(){return confirmedAt;} public void setConfirmedAt(Instant confirmedAt){this.confirmedAt=confirmedAt;} public Instant getCheckedInAt(){return checkedInAt;} public void setCheckedInAt(Instant v){checkedInAt=v;} public UUID getCheckedInBy(){return checkedInBy;} public void setCheckedInBy(UUID v){checkedInBy=v;} public Instant getRefundRequestedAt(){return refundRequestedAt;} public void setRefundRequestedAt(Instant v){refundRequestedAt=v;} public Instant getRefundedAt(){return refundedAt;} public void setRefundedAt(Instant v){refundedAt=v;} public BigDecimal getRefundAmount(){return refundAmount;} public void setRefundAmount(BigDecimal v){refundAmount=v;} public String getRefundReason(){return refundReason;} public void setRefundReason(String v){refundReason=v;} public Integer getTicketVersion(){return ticketVersion;} public void setTicketVersion(Integer v){ticketVersion=v;} public Integer getTransferCount(){return transferCount;} public void setTransferCount(Integer v){transferCount=v;} public Instant getTransferredAt(){return transferredAt;} public void setTransferredAt(Instant v){transferredAt=v;} public UUID getTransferredFromUserId(){return transferredFromUserId;} public void setTransferredFromUserId(UUID v){transferredFromUserId=v;} public BigDecimal getRefundRatePercent(){return refundRatePercent;} public void setRefundRatePercent(BigDecimal v){refundRatePercent=v;} public BigDecimal getRefundFeeAmount(){return refundFeeAmount;} public void setRefundFeeAmount(BigDecimal v){refundFeeAmount=v;} public String getRefundPolicyCode(){return refundPolicyCode;} public void setRefundPolicyCode(String v){refundPolicyCode=v;} public Boolean getRefundAutomatic(){return refundAutomatic;} public void setRefundAutomatic(Boolean v){refundAutomatic=v;} public Instant getRefundProcessedAt(){return refundProcessedAt;} public void setRefundProcessedAt(Instant v){refundProcessedAt=v;} public String getRefundProcessedBy(){return refundProcessedBy;} public void setRefundProcessedBy(String v){refundProcessedBy=v;} public String getRefundProviderReference(){return refundProviderReference;} public void setRefundProviderReference(String v){refundProviderReference=v;}
}
