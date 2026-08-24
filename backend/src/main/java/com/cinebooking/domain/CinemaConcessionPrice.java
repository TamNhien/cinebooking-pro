package com.cinebooking.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="cinema_concession_price", uniqueConstraints=@UniqueConstraint(name="uq_branch_concession_price", columnNames={"cinema_id","product_id"}))
public class CinemaConcessionPrice {
    @Id private UUID id;
    @Column(name="cinema_id",nullable=false) private UUID cinemaId;
    @Column(name="product_id",nullable=false) private UUID productId;
    @Column(nullable=false,precision=12,scale=2) private BigDecimal price;
    @Column(nullable=false) private Boolean active;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;
    @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(active==null)active=true;if(updatedAt==null)updatedAt=Instant.now();}
    @PreUpdate void update(){updatedAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getCinemaId(){return cinemaId;} public void setCinemaId(UUID v){cinemaId=v;}
    public UUID getProductId(){return productId;} public void setProductId(UUID v){productId=v;}
    public BigDecimal getPrice(){return price;} public void setPrice(BigDecimal v){price=v;}
    public Boolean getActive(){return active;} public void setActive(Boolean v){active=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
