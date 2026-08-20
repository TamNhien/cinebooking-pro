package com.cinebooking.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="voucher")
public class Voucher {
    @Id private UUID id;
    @Column(nullable=false,unique=true) private String code;
    @Column(nullable=false) private String name;
    @Column(name="discount_type",nullable=false) private String discountType;
    @Column(name="discount_value",nullable=false) private BigDecimal discountValue;
    @Column(name="min_order_amount",nullable=false) private BigDecimal minOrderAmount;
    @Column(name="max_discount") private BigDecimal maxDiscount;
    @Column(name="starts_at") private Instant startsAt;
    @Column(name="ends_at") private Instant endsAt;
    @Column(name="usage_limit") private Integer usageLimit;
    @Column(name="used_count",nullable=false) private Integer usedCount;
    @Column(nullable=false) private Boolean active;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="owner_user_id") private UUID ownerUserId;
    @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(minOrderAmount==null)minOrderAmount=BigDecimal.ZERO;if(usedCount==null)usedCount=0;if(active==null)active=true;if(createdAt==null)createdAt=Instant.now(); if(code!=null)code=code.trim().toUpperCase();}
    @PreUpdate void upd(){if(code!=null)code=code.trim().toUpperCase();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;} public String getCode(){return code;} public void setCode(String v){code=v;} public String getName(){return name;} public void setName(String v){name=v;} public String getDiscountType(){return discountType;} public void setDiscountType(String v){discountType=v;} public BigDecimal getDiscountValue(){return discountValue;} public void setDiscountValue(BigDecimal v){discountValue=v;} public BigDecimal getMinOrderAmount(){return minOrderAmount;} public void setMinOrderAmount(BigDecimal v){minOrderAmount=v;} public BigDecimal getMaxDiscount(){return maxDiscount;} public void setMaxDiscount(BigDecimal v){maxDiscount=v;} public Instant getStartsAt(){return startsAt;} public void setStartsAt(Instant v){startsAt=v;} public Instant getEndsAt(){return endsAt;} public void setEndsAt(Instant v){endsAt=v;} public Integer getUsageLimit(){return usageLimit;} public void setUsageLimit(Integer v){usageLimit=v;} public Integer getUsedCount(){return usedCount;} public void setUsedCount(Integer v){usedCount=v;} public Boolean getActive(){return active;} public void setActive(Boolean v){active=v;} public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;} public UUID getOwnerUserId(){return ownerUserId;} public void setOwnerUserId(UUID v){ownerUserId=v;}
}
