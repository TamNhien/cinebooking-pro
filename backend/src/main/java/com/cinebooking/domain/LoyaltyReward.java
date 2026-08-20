package com.cinebooking.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="loyalty_reward")
public class LoyaltyReward {
 @Id private UUID id; @Column(nullable=false,unique=true) private String code; @Column(nullable=false) private String name; private String description;
 @Column(name="reward_type",nullable=false) private String rewardType; @Column(name="points_cost",nullable=false) private Integer pointsCost;
 @Column(name="discount_type") private String discountType; @Column(name="discount_value") private BigDecimal discountValue;
 @Column(name="min_order_amount",nullable=false) private BigDecimal minOrderAmount; @Column(name="max_discount") private BigDecimal maxDiscount;
 @Column(name="validity_days",nullable=false) private Integer validityDays; @Column(name="concession_product_id") private UUID concessionProductId;
 @Column(name="concession_quantity") private Integer concessionQuantity; @Column(nullable=false) private Boolean active; @Column(name="sort_order",nullable=false) private Integer sortOrder;
 @Column(name="created_at",nullable=false) private Instant createdAt;
 @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(active==null)active=true;if(sortOrder==null)sortOrder=0;if(validityDays==null)validityDays=30;if(minOrderAmount==null)minOrderAmount=BigDecimal.ZERO;if(createdAt==null)createdAt=Instant.now();}
 public UUID getId(){return id;} public void setId(UUID v){id=v;} public String getCode(){return code;} public void setCode(String v){code=v;} public String getName(){return name;} public void setName(String v){name=v;} public String getDescription(){return description;} public void setDescription(String v){description=v;} public String getRewardType(){return rewardType;} public void setRewardType(String v){rewardType=v;} public Integer getPointsCost(){return pointsCost;} public void setPointsCost(Integer v){pointsCost=v;} public String getDiscountType(){return discountType;} public void setDiscountType(String v){discountType=v;} public BigDecimal getDiscountValue(){return discountValue;} public void setDiscountValue(BigDecimal v){discountValue=v;} public BigDecimal getMinOrderAmount(){return minOrderAmount;} public void setMinOrderAmount(BigDecimal v){minOrderAmount=v;} public BigDecimal getMaxDiscount(){return maxDiscount;} public void setMaxDiscount(BigDecimal v){maxDiscount=v;} public Integer getValidityDays(){return validityDays;} public void setValidityDays(Integer v){validityDays=v;} public UUID getConcessionProductId(){return concessionProductId;} public void setConcessionProductId(UUID v){concessionProductId=v;} public Integer getConcessionQuantity(){return concessionQuantity;} public void setConcessionQuantity(Integer v){concessionQuantity=v;} public Boolean getActive(){return active;} public void setActive(Boolean v){active=v;} public Integer getSortOrder(){return sortOrder;} public void setSortOrder(Integer v){sortOrder=v;} public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
}
