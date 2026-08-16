package com.cinebooking.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity @Table(name="booking_concession")
public class BookingConcession {
    @Id private UUID id;
    @Column(name="booking_id",nullable=false) private UUID bookingId;
    @Column(name="product_id") private UUID productId;
    @Column(name="product_name",nullable=false) private String productName;
    @Column(name="unit_price",nullable=false) private BigDecimal unitPrice;
    @Column(nullable=false) private Integer quantity;
    @Column(nullable=false) private BigDecimal subtotal;
    @PrePersist void pre(){if(id==null)id=UUID.randomUUID();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;} public UUID getBookingId(){return bookingId;} public void setBookingId(UUID v){bookingId=v;} public UUID getProductId(){return productId;} public void setProductId(UUID v){productId=v;} public String getProductName(){return productName;} public void setProductName(String v){productName=v;} public BigDecimal getUnitPrice(){return unitPrice;} public void setUnitPrice(BigDecimal v){unitPrice=v;} public Integer getQuantity(){return quantity;} public void setQuantity(Integer v){quantity=v;} public BigDecimal getSubtotal(){return subtotal;} public void setSubtotal(BigDecimal v){subtotal=v;}
}
