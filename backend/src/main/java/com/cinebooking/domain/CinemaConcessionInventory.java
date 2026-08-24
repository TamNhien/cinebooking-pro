package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="cinema_concession_inventory", uniqueConstraints=@UniqueConstraint(name="uq_branch_concession_inventory", columnNames={"cinema_id","product_id"}))
public class CinemaConcessionInventory {
    @Id private UUID id;
    @Column(name="cinema_id",nullable=false) private UUID cinemaId;
    @Column(name="product_id",nullable=false) private UUID productId;
    @Column(name="stock_on_hand",nullable=false) private Integer stockOnHand;
    @Column(name="stock_reserved",nullable=false) private Integer stockReserved;
    @Column(name="low_stock_threshold",nullable=false) private Integer lowStockThreshold;
    @Column(name="target_stock",nullable=false) private Integer targetStock;
    @Column(nullable=false) private Boolean active;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;
    @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(stockOnHand==null)stockOnHand=0;if(stockReserved==null)stockReserved=0;if(lowStockThreshold==null)lowStockThreshold=10;if(targetStock==null)targetStock=50;if(active==null)active=true;if(updatedAt==null)updatedAt=Instant.now();}
    @PreUpdate void update(){updatedAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getCinemaId(){return cinemaId;} public void setCinemaId(UUID v){cinemaId=v;}
    public UUID getProductId(){return productId;} public void setProductId(UUID v){productId=v;}
    public Integer getStockOnHand(){return stockOnHand;} public void setStockOnHand(Integer v){stockOnHand=v;}
    public Integer getStockReserved(){return stockReserved;} public void setStockReserved(Integer v){stockReserved=v;}
    public Integer getLowStockThreshold(){return lowStockThreshold;} public void setLowStockThreshold(Integer v){lowStockThreshold=v;}
    public Integer getTargetStock(){return targetStock;} public void setTargetStock(Integer v){targetStock=v;}
    public Boolean getActive(){return active;} public void setActive(Boolean v){active=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
