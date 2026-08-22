package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="staff_incident")
public class StaffIncident {
    @Id private UUID id;
    @Column(name="cinema_id",nullable=false) private UUID cinemaId;
    @Column(name="shift_id") private UUID shiftId;
    @Column(name="attendance_id") private UUID attendanceId;
    @Column(name="reported_by",nullable=false) private UUID reportedBy;
    @Column(nullable=false,length=30) private String category;
    @Column(nullable=false,length=20) private String severity;
    @Column(nullable=false,length=160) private String title;
    @Column(nullable=false,length=2000) private String description;
    @Column(nullable=false,length=20) private String status;
    @Column(name="resolved_by") private UUID resolvedBy;
    @Column(name="resolved_at") private Instant resolvedAt;
    @Column(name="resolution_note",length=1000) private String resolutionNote;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;

    @PrePersist void prePersist(){if(id==null)id=UUID.randomUUID();if(status==null)status="OPEN";if(createdAt==null)createdAt=Instant.now();if(updatedAt==null)updatedAt=createdAt;}
    @PreUpdate void preUpdate(){updatedAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getCinemaId(){return cinemaId;} public void setCinemaId(UUID v){cinemaId=v;}
    public UUID getShiftId(){return shiftId;} public void setShiftId(UUID v){shiftId=v;}
    public UUID getAttendanceId(){return attendanceId;} public void setAttendanceId(UUID v){attendanceId=v;}
    public UUID getReportedBy(){return reportedBy;} public void setReportedBy(UUID v){reportedBy=v;}
    public String getCategory(){return category;} public void setCategory(String v){category=v;}
    public String getSeverity(){return severity;} public void setSeverity(String v){severity=v;}
    public String getTitle(){return title;} public void setTitle(String v){title=v;}
    public String getDescription(){return description;} public void setDescription(String v){description=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public UUID getResolvedBy(){return resolvedBy;} public void setResolvedBy(UUID v){resolvedBy=v;}
    public Instant getResolvedAt(){return resolvedAt;} public void setResolvedAt(Instant v){resolvedAt=v;}
    public String getResolutionNote(){return resolutionNote;} public void setResolutionNote(String v){resolutionNote=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
