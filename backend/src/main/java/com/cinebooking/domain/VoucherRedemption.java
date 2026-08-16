package com.cinebooking.domain;
import jakarta.persistence.*; import java.math.BigDecimal; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="voucher_redemption")
public class VoucherRedemption {
 @Id private UUID id; @Column(name="voucher_id",nullable=false) private UUID voucherId; @Column(name="user_id",nullable=false) private UUID userId; @Column(name="booking_id",nullable=false,unique=true) private UUID bookingId; @Column(name="discount_amount",nullable=false) private BigDecimal discountAmount; @Column(name="created_at",nullable=false) private Instant createdAt;
 @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(createdAt==null)createdAt=Instant.now();}
 public UUID getId(){return id;} public void setId(UUID v){id=v;} public UUID getVoucherId(){return voucherId;} public void setVoucherId(UUID v){voucherId=v;} public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;} public UUID getBookingId(){return bookingId;} public void setBookingId(UUID v){bookingId=v;} public BigDecimal getDiscountAmount(){return discountAmount;} public void setDiscountAmount(BigDecimal v){discountAmount=v;} public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
}
