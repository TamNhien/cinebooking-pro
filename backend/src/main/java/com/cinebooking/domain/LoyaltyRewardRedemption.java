package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="loyalty_reward_redemption")
public class LoyaltyRewardRedemption {
 @Id private UUID id; @Column(name="user_id",nullable=false) private UUID userId; @Column(name="reward_id",nullable=false) private UUID rewardId;
 @Column(name="voucher_id") private UUID voucherId; @Column(name="redemption_code",nullable=false,unique=true) private String redemptionCode;
 @Column(name="points_cost",nullable=false) private Integer pointsCost; @Column(nullable=false) private String status; @Column(name="redeemed_at",nullable=false) private Instant redeemedAt;
 @Column(name="claimed_at") private Instant claimedAt; @Column(name="claimed_by_user_id") private UUID claimedByUserId;
 @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(status==null)status="ISSUED";if(redeemedAt==null)redeemedAt=Instant.now();}
 public UUID getId(){return id;} public void setId(UUID v){id=v;} public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;} public UUID getRewardId(){return rewardId;} public void setRewardId(UUID v){rewardId=v;} public UUID getVoucherId(){return voucherId;} public void setVoucherId(UUID v){voucherId=v;} public String getRedemptionCode(){return redemptionCode;} public void setRedemptionCode(String v){redemptionCode=v;} public Integer getPointsCost(){return pointsCost;} public void setPointsCost(Integer v){pointsCost=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;} public Instant getRedeemedAt(){return redeemedAt;} public void setRedeemedAt(Instant v){redeemedAt=v;} public Instant getClaimedAt(){return claimedAt;} public void setClaimedAt(Instant v){claimedAt=v;} public UUID getClaimedByUserId(){return claimedByUserId;} public void setClaimedByUserId(UUID v){claimedByUserId=v;}
}
