package com.cinebooking.domain;
import jakarta.persistence.*; import java.math.BigDecimal; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="showtime")
public class Showtime {
 @Id private UUID id; @Column(name="movie_id",nullable=false) private UUID movieId; @Column(name="auditorium_id",nullable=false) private UUID auditoriumId; @Column(name="start_time",nullable=false) private Instant startTime; @Column(name="base_price",nullable=false) private BigDecimal basePrice; @Enumerated(EnumType.STRING) @Column(nullable=false) private ShowtimeStatus status;
 @PrePersist void pre(){if(id==null)id=UUID.randomUUID(); if(status==null)status=ShowtimeStatus.OPEN;}
 public UUID getId(){return id;} public void setId(UUID id){this.id=id;} public UUID getMovieId(){return movieId;} public void setMovieId(UUID movieId){this.movieId=movieId;} public UUID getAuditoriumId(){return auditoriumId;} public void setAuditoriumId(UUID auditoriumId){this.auditoriumId=auditoriumId;} public Instant getStartTime(){return startTime;} public void setStartTime(Instant startTime){this.startTime=startTime;} public BigDecimal getBasePrice(){return basePrice;} public void setBasePrice(BigDecimal basePrice){this.basePrice=basePrice;} public ShowtimeStatus getStatus(){return status;} public void setStatus(ShowtimeStatus status){this.status=status;}
}
