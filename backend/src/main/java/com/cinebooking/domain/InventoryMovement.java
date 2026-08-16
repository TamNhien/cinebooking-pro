package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "inventory_movement")
public class InventoryMovement {
    @Id private UUID id;
    @Column(name="product_id", nullable=false) private UUID productId;
    @Column(name="booking_id") private UUID bookingId;
    @Column(name="movement_type", nullable=false) private String movementType;
    @Column(name="quantity_delta", nullable=false) private Integer quantityDelta;
    @Column(name="reserved_delta", nullable=false) private Integer reservedDelta;
    @Column(name="stock_after", nullable=false) private Integer stockAfter;
    @Column(name="reserved_after", nullable=false) private Integer reservedAfter;
    @Column(name="actor_email") private String actorEmail;
    @Column(length=300) private String note;
    @Column(name="created_at", nullable=false) private Instant createdAt;

    @PrePersist void pre(){
        if(id==null) id=UUID.randomUUID();
        if(quantityDelta==null) quantityDelta=0;
        if(reservedDelta==null) reservedDelta=0;
        if(createdAt==null) createdAt=Instant.now();
    }

    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getProductId(){return productId;} public void setProductId(UUID v){productId=v;}
    public UUID getBookingId(){return bookingId;} public void setBookingId(UUID v){bookingId=v;}
    public String getMovementType(){return movementType;} public void setMovementType(String v){movementType=v;}
    public Integer getQuantityDelta(){return quantityDelta;} public void setQuantityDelta(Integer v){quantityDelta=v;}
    public Integer getReservedDelta(){return reservedDelta;} public void setReservedDelta(Integer v){reservedDelta=v;}
    public Integer getStockAfter(){return stockAfter;} public void setStockAfter(Integer v){stockAfter=v;}
    public Integer getReservedAfter(){return reservedAfter;} public void setReservedAfter(Integer v){reservedAfter=v;}
    public String getActorEmail(){return actorEmail;} public void setActorEmail(String v){actorEmail=v;}
    public String getNote(){return note;} public void setNote(String v){note=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
}
