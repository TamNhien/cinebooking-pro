package com.cinebooking.domain;
import jakarta.persistence.*; import java.math.BigDecimal; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="booking_seat")
public class BookingSeat {
 @Id private UUID id; @Column(name="booking_id",nullable=false) private UUID bookingId; @Column(name="showtime_id",nullable=false) private UUID showtimeId; @Column(name="seat_id",nullable=false) private UUID seatId; @Column(nullable=false) private BigDecimal price; @Column(name="released_at") private Instant releasedAt;
 @PrePersist void pre(){if(id==null)id=UUID.randomUUID();}
 public UUID getId(){return id;} public void setId(UUID id){this.id=id;} public UUID getBookingId(){return bookingId;} public void setBookingId(UUID bookingId){this.bookingId=bookingId;} public UUID getShowtimeId(){return showtimeId;} public void setShowtimeId(UUID showtimeId){this.showtimeId=showtimeId;} public UUID getSeatId(){return seatId;} public void setSeatId(UUID seatId){this.seatId=seatId;} public BigDecimal getPrice(){return price;} public void setPrice(BigDecimal price){this.price=price;} public Instant getReleasedAt(){return releasedAt;} public void setReleasedAt(Instant releasedAt){this.releasedAt=releasedAt;}
}
