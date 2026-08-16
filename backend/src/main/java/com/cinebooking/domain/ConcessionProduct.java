package com.cinebooking.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="concession_product")
public class ConcessionProduct {
    @Id private UUID id;
    @Column(nullable=false) private String name;
    @Column(columnDefinition="text") private String description;
    @Column(nullable=false) private BigDecimal price;
    @Column(name="image_url",columnDefinition="text") private String imageUrl;
    @Column(nullable=false) private Boolean active;
    @Column(name="sort_order",nullable=false) private Integer sortOrder;
    @Column(name="inventory_enabled",nullable=false) private Boolean inventoryEnabled;
    @Column(name="stock_on_hand",nullable=false) private Integer stockOnHand;
    @Column(name="stock_reserved",nullable=false) private Integer stockReserved;
    @Column(name="low_stock_threshold",nullable=false) private Integer lowStockThreshold;
    @Column(name="created_at",nullable=false) private Instant createdAt;

    @PrePersist void pre(){
        if(id==null) id=UUID.randomUUID();
        if(active==null) active=true;
        if(sortOrder==null) sortOrder=0;
        if(inventoryEnabled==null) inventoryEnabled=true;
        if(stockOnHand==null) stockOnHand=0;
        if(stockReserved==null) stockReserved=0;
        if(lowStockThreshold==null) lowStockThreshold=10;
        if(createdAt==null) createdAt=Instant.now();
    }

    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public String getName(){return name;} public void setName(String v){name=v;}
    public String getDescription(){return description;} public void setDescription(String v){description=v;}
    public BigDecimal getPrice(){return price;} public void setPrice(BigDecimal v){price=v;}
    public String getImageUrl(){return imageUrl;} public void setImageUrl(String v){imageUrl=v;}
    public Boolean getActive(){return active;} public void setActive(Boolean v){active=v;}
    public Integer getSortOrder(){return sortOrder;} public void setSortOrder(Integer v){sortOrder=v;}
    public Boolean getInventoryEnabled(){return inventoryEnabled;} public void setInventoryEnabled(Boolean v){inventoryEnabled=v;}
    public Integer getStockOnHand(){return stockOnHand;} public void setStockOnHand(Integer v){stockOnHand=v;}
    public Integer getStockReserved(){return stockReserved;} public void setStockReserved(Integer v){stockReserved=v;}
    public Integer getLowStockThreshold(){return lowStockThreshold;} public void setLowStockThreshold(Integer v){lowStockThreshold=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
}
