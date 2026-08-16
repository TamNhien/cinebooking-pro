package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "staff_shift")
public class StaffShift {
    @Id private UUID id;
    @Column(name="staff_user_id", nullable=false) private UUID staffUserId;
    @Column(name="cinema_id", nullable=false) private UUID cinemaId;
    @Column(name="shift_date", nullable=false) private LocalDate shiftDate;
    @Column(name="start_time", nullable=false) private LocalTime startTime;
    @Column(name="end_time", nullable=false) private LocalTime endTime;
    @Column(nullable=false, length=20) private String status;
    @Column(length=300) private String note;
    @Column(name="assigned_by") private UUID assignedBy;
    @Column(name="created_at", nullable=false) private Instant createdAt;
    @Column(name="updated_at", nullable=false) private Instant updatedAt;

    @PrePersist void prePersist(){
        if(id==null)id=UUID.randomUUID();
        if(status==null)status="SCHEDULED";
        if(createdAt==null)createdAt=Instant.now();
        if(updatedAt==null)updatedAt=Instant.now();
    }
    @PreUpdate void preUpdate(){updatedAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID id){this.id=id;}
    public UUID getStaffUserId(){return staffUserId;} public void setStaffUserId(UUID v){staffUserId=v;}
    public UUID getCinemaId(){return cinemaId;} public void setCinemaId(UUID v){cinemaId=v;}
    public LocalDate getShiftDate(){return shiftDate;} public void setShiftDate(LocalDate v){shiftDate=v;}
    public LocalTime getStartTime(){return startTime;} public void setStartTime(LocalTime v){startTime=v;}
    public LocalTime getEndTime(){return endTime;} public void setEndTime(LocalTime v){endTime=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public String getNote(){return note;} public void setNote(String v){note=v;}
    public UUID getAssignedBy(){return assignedBy;} public void setAssignedBy(UUID v){assignedBy=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
