package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name="staff_leave_request")
public class StaffLeaveRequest {
    @Id private UUID id;
    @Column(name="staff_user_id",nullable=false) private UUID staffUserId;
    @Column(name="cinema_id",nullable=false) private UUID cinemaId;
    @Column(name="from_date",nullable=false) private LocalDate fromDate;
    @Column(name="to_date",nullable=false) private LocalDate toDate;
    @Column(name="leave_type",nullable=false,length=20) private String leaveType;
    @Column(nullable=false,length=500) private String reason;
    @Column(nullable=false,length=20) private String status;
    @Column(name="reviewed_by") private UUID reviewedBy;
    @Column(name="reviewed_at") private Instant reviewedAt;
    @Column(name="review_note",length=500) private String reviewNote;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;

    @PrePersist void prePersist(){if(id==null)id=UUID.randomUUID();if(status==null)status="PENDING";if(createdAt==null)createdAt=Instant.now();if(updatedAt==null)updatedAt=Instant.now();}
    @PreUpdate void preUpdate(){updatedAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getStaffUserId(){return staffUserId;} public void setStaffUserId(UUID v){staffUserId=v;}
    public UUID getCinemaId(){return cinemaId;} public void setCinemaId(UUID v){cinemaId=v;}
    public LocalDate getFromDate(){return fromDate;} public void setFromDate(LocalDate v){fromDate=v;}
    public LocalDate getToDate(){return toDate;} public void setToDate(LocalDate v){toDate=v;}
    public String getLeaveType(){return leaveType;} public void setLeaveType(String v){leaveType=v;}
    public String getReason(){return reason;} public void setReason(String v){reason=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public UUID getReviewedBy(){return reviewedBy;} public void setReviewedBy(UUID v){reviewedBy=v;}
    public Instant getReviewedAt(){return reviewedAt;} public void setReviewedAt(Instant v){reviewedAt=v;}
    public String getReviewNote(){return reviewNote;} public void setReviewNote(String v){reviewNote=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
