package com.cinebooking.domain;
import jakarta.persistence.*; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="loyalty_transaction")
public class LoyaltyTransaction {
 @Id private UUID id; @Column(name="user_id",nullable=false) private UUID userId; @Column(name="booking_id") private UUID bookingId; @Column(name="transaction_type",nullable=false) private String transactionType; @Column(nullable=false) private Integer points; private String description; @Column(name="created_at",nullable=false) private Instant createdAt;
 @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(createdAt==null)createdAt=Instant.now();}
 public UUID getId(){return id;} public void setId(UUID v){id=v;} public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;} public UUID getBookingId(){return bookingId;} public void setBookingId(UUID v){bookingId=v;} public String getTransactionType(){return transactionType;} public void setTransactionType(String v){transactionType=v;} public Integer getPoints(){return points;} public void setPoints(Integer v){points=v;} public String getDescription(){return description;} public void setDescription(String v){description=v;} public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
}
