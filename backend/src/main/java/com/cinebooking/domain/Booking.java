package com.cinebooking.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="booking")
public class Booking {
 @Id private UUID id;
 @Column(name="user_id",nullable=false) private UUID userId;
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
 @PrePersist public void pre(){if(id==null)id=UUID.randomUUID(); if(createdAt==null)createdAt=Instant.now(); if(status==null)status=BookingStatus.PENDING; if(totalAmount==null)totalAmount=BigDecimal.ZERO;if(seatAmount==null)seatAmount=BigDecimal.ZERO;if(concessionAmount==null)concessionAmount=BigDecimal.ZERO;if(discountAmount==null)discountAmount=BigDecimal.ZERO;if(pointsRedeemed==null)pointsRedeemed=0;if(benefitsRefunded==null)benefitsRefunded=false;if(reminderSent==null)reminderSent=false;}
 public UUID getId(){return id;} public void setId(UUID id){this.id=id;} public UUID getUserId(){return userId;} public void setUserId(UUID userId){this.userId=userId;} public UUID getShowtimeId(){return showtimeId;} public void setShowtimeId(UUID showtimeId){this.showtimeId=showtimeId;} public BookingStatus getStatus(){return status;} public void setStatus(BookingStatus status){this.status=status;} public BigDecimal getTotalAmount(){return totalAmount;} public void setTotalAmount(BigDecimal totalAmount){this.totalAmount=totalAmount;} public BigDecimal getSeatAmount(){return seatAmount;} public void setSeatAmount(BigDecimal v){seatAmount=v;} public BigDecimal getConcessionAmount(){return concessionAmount;} public void setConcessionAmount(BigDecimal v){concessionAmount=v;} public BigDecimal getDiscountAmount(){return discountAmount;} public void setDiscountAmount(BigDecimal v){discountAmount=v;} public Integer getPointsRedeemed(){return pointsRedeemed;} public void setPointsRedeemed(Integer v){pointsRedeemed=v;} public String getVoucherCode(){return voucherCode;} public void setVoucherCode(String v){voucherCode=v;} public Boolean getBenefitsRefunded(){return benefitsRefunded;} public void setBenefitsRefunded(Boolean v){benefitsRefunded=v;} public Boolean getReminderSent(){return reminderSent;} public void setReminderSent(Boolean v){reminderSent=v;} public String getIdempotencyKey(){return idempotencyKey;} public void setIdempotencyKey(String v){idempotencyKey=v;} public String getRequestFingerprint(){return requestFingerprint;} public void setRequestFingerprint(String v){requestFingerprint=v;} public Instant getExpiresAt(){return expiresAt;} public void setExpiresAt(Instant expiresAt){this.expiresAt=expiresAt;} public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant createdAt){this.createdAt=createdAt;} public Instant getConfirmedAt(){return confirmedAt;} public void setConfirmedAt(Instant confirmedAt){this.confirmedAt=confirmedAt;} public Instant getCheckedInAt(){return checkedInAt;} public void setCheckedInAt(Instant v){checkedInAt=v;} public UUID getCheckedInBy(){return checkedInBy;} public void setCheckedInBy(UUID v){checkedInBy=v;} public Instant getRefundRequestedAt(){return refundRequestedAt;} public void setRefundRequestedAt(Instant v){refundRequestedAt=v;} public Instant getRefundedAt(){return refundedAt;} public void setRefundedAt(Instant v){refundedAt=v;} public BigDecimal getRefundAmount(){return refundAmount;} public void setRefundAmount(BigDecimal v){refundAmount=v;} public String getRefundReason(){return refundReason;} public void setRefundReason(String v){refundReason=v;}
}
