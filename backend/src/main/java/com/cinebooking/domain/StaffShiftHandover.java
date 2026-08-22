package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="staff_shift_handover")
public class StaffShiftHandover {
    @Id private UUID id;
    @Column(name="cinema_id",nullable=false) private UUID cinemaId;
    @Column(name="from_shift_id",nullable=false) private UUID fromShiftId;
    @Column(name="from_attendance_id",nullable=false) private UUID fromAttendanceId;
    @Column(name="from_staff_user_id",nullable=false) private UUID fromStaffUserId;
    @Column(name="to_staff_user_id",nullable=false) private UUID toStaffUserId;
    @Column(nullable=false,length=1000) private String summary;
    @Column(nullable=false,length=20) private String status;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="accepted_at") private Instant acceptedAt;
    @Column(name="accepted_by") private UUID acceptedBy;

    @PrePersist void prePersist(){if(id==null)id=UUID.randomUUID();if(status==null)status="PENDING";if(createdAt==null)createdAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getCinemaId(){return cinemaId;} public void setCinemaId(UUID v){cinemaId=v;}
    public UUID getFromShiftId(){return fromShiftId;} public void setFromShiftId(UUID v){fromShiftId=v;}
    public UUID getFromAttendanceId(){return fromAttendanceId;} public void setFromAttendanceId(UUID v){fromAttendanceId=v;}
    public UUID getFromStaffUserId(){return fromStaffUserId;} public void setFromStaffUserId(UUID v){fromStaffUserId=v;}
    public UUID getToStaffUserId(){return toStaffUserId;} public void setToStaffUserId(UUID v){toStaffUserId=v;}
    public String getSummary(){return summary;} public void setSummary(String v){summary=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Instant getAcceptedAt(){return acceptedAt;} public void setAcceptedAt(Instant v){acceptedAt=v;}
    public UUID getAcceptedBy(){return acceptedBy;} public void setAcceptedBy(UUID v){acceptedBy=v;}
}
