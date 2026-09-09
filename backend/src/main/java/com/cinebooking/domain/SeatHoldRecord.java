package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="seat_hold")
public class SeatHoldRecord {
    @Id private UUID id;
    @Column(name="showtime_id",nullable=false) private UUID showtimeId;
    @Column(name="seat_id",nullable=false) private UUID seatId;
    @Column(name="user_id",nullable=false) private UUID userId;
    @Column(name="hold_token",nullable=false) private UUID holdToken;
    @Column(nullable=false,length=16) private String state;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="refreshed_at",nullable=false) private Instant refreshedAt;
    @Column(name="expires_at",nullable=false) private Instant expiresAt;
    @Column(name="released_at") private Instant releasedAt;
    @Column(name="converted_booking_id") private UUID convertedBookingId;
    @Column(name="last_event",nullable=false,length=48) private String lastEvent;
    @Version @Column(nullable=false) private Long version;

    @PrePersist void pre(){
        Instant now=Instant.now();
        if(id==null)id=UUID.randomUUID();
        if(state==null)state="HELD";
        if(createdAt==null)createdAt=now;
        if(refreshedAt==null)refreshedAt=createdAt;
        if(lastEvent==null)lastEvent="SEAT_HOLD_CREATED";
        if(version==null)version=0L;
    }

    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getShowtimeId(){return showtimeId;} public void setShowtimeId(UUID v){showtimeId=v;}
    public UUID getSeatId(){return seatId;} public void setSeatId(UUID v){seatId=v;}
    public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;}
    public UUID getHoldToken(){return holdToken;} public void setHoldToken(UUID v){holdToken=v;}
    public String getState(){return state;} public void setState(String v){state=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Instant getRefreshedAt(){return refreshedAt;} public void setRefreshedAt(Instant v){refreshedAt=v;}
    public Instant getExpiresAt(){return expiresAt;} public void setExpiresAt(Instant v){expiresAt=v;}
    public Instant getReleasedAt(){return releasedAt;} public void setReleasedAt(Instant v){releasedAt=v;}
    public UUID getConvertedBookingId(){return convertedBookingId;} public void setConvertedBookingId(UUID v){convertedBookingId=v;}
    public String getLastEvent(){return lastEvent;} public void setLastEvent(String v){lastEvent=v;}
    public Long getVersion(){return version;} public void setVersion(Long v){version=v;}
}
