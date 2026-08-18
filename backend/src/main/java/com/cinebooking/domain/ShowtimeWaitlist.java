package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="showtime_waitlist", uniqueConstraints=@UniqueConstraint(name="uq_showtime_waitlist_user", columnNames={"user_id","showtime_id"}))
public class ShowtimeWaitlist {
    @Id private UUID id;
    @Column(name="user_id", nullable=false) private UUID userId;
    @Column(name="showtime_id", nullable=false) private UUID showtimeId;
    @Column(nullable=false, length=20) private String status;
    @Column(name="created_at", nullable=false) private Instant createdAt;
    @Column(name="notified_at") private Instant notifiedAt;
    @Column(name="last_available_count", nullable=false) private Integer lastAvailableCount;

    @PrePersist void pre(){
        if(id==null)id=UUID.randomUUID();
        if(status==null)status="ACTIVE";
        if(createdAt==null)createdAt=Instant.now();
        if(lastAvailableCount==null)lastAvailableCount=0;
    }
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;}
    public UUID getShowtimeId(){return showtimeId;} public void setShowtimeId(UUID v){showtimeId=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Instant getNotifiedAt(){return notifiedAt;} public void setNotifiedAt(Instant v){notifiedAt=v;}
    public Integer getLastAvailableCount(){return lastAvailableCount;} public void setLastAvailableCount(Integer v){lastAvailableCount=v;}
}
