package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="loyalty_point_lot")
public class LoyaltyPointLot {
    @Id private UUID id;
    @Column(name="user_id",nullable=false) private UUID userId;
    @Column(name="source_transaction_id") private UUID sourceTransactionId;
    @Column(name="original_points",nullable=false) private Integer originalPoints;
    @Column(name="remaining_points",nullable=false) private Integer remainingPoints;
    @Column(name="expires_at",nullable=false) private Instant expiresAt;
    @Column(name="expired_at") private Instant expiredAt;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(createdAt==null)createdAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;}
    public UUID getSourceTransactionId(){return sourceTransactionId;} public void setSourceTransactionId(UUID v){sourceTransactionId=v;}
    public Integer getOriginalPoints(){return originalPoints;} public void setOriginalPoints(Integer v){originalPoints=v;}
    public Integer getRemainingPoints(){return remainingPoints;} public void setRemainingPoints(Integer v){remainingPoints=v;}
    public Instant getExpiresAt(){return expiresAt;} public void setExpiresAt(Instant v){expiresAt=v;}
    public Instant getExpiredAt(){return expiredAt;} public void setExpiredAt(Instant v){expiredAt=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
}
