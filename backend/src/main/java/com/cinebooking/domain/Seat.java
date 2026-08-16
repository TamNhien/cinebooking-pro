package com.cinebooking.domain;
import jakarta.persistence.*; import java.math.BigDecimal; import java.util.UUID;
@Entity @Table(name="seat")
public class Seat {
 @Id private UUID id; @Column(name="auditorium_id",nullable=false) private UUID auditoriumId; @Column(name="row_label",nullable=false) private String rowLabel; @Column(name="seat_number",nullable=false) private Integer seatNumber; @Enumerated(EnumType.STRING) @Column(name="seat_type",nullable=false) private SeatType seatType; @Column(name="price_modifier",nullable=false) private BigDecimal priceModifier;
 @PrePersist void pre(){if(id==null)id=UUID.randomUUID(); if(seatType==null)seatType=SeatType.STANDARD; if(priceModifier==null)priceModifier=BigDecimal.ZERO;}
 public UUID getId(){return id;} public void setId(UUID id){this.id=id;} public UUID getAuditoriumId(){return auditoriumId;} public void setAuditoriumId(UUID auditoriumId){this.auditoriumId=auditoriumId;} public String getRowLabel(){return rowLabel;} public void setRowLabel(String rowLabel){this.rowLabel=rowLabel;} public Integer getSeatNumber(){return seatNumber;} public void setSeatNumber(Integer seatNumber){this.seatNumber=seatNumber;} public SeatType getSeatType(){return seatType;} public void setSeatType(SeatType seatType){this.seatType=seatType;} public BigDecimal getPriceModifier(){return priceModifier;} public void setPriceModifier(BigDecimal priceModifier){this.priceModifier=priceModifier;}
}
