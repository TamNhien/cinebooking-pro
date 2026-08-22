package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="maintenance_work_order")
public class MaintenanceWorkOrder {
    @Id private UUID id;
    @Column(name="cinema_id",nullable=false) private UUID cinemaId;
    @Column(name="auditorium_id") private UUID auditoriumId;
    @Column(name="asset_id") private UUID assetId;
    @Column(name="source_incident_id") private UUID sourceIncidentId;
    @Column(nullable=false,length=160) private String title;
    @Column(nullable=false,length=2000) private String description;
    @Column(nullable=false,length=20) private String priority;
    @Column(nullable=false,length=24) private String status;
    @Column(name="assigned_to") private UUID assignedTo;
    @Column(name="due_at") private Instant dueAt;
    @Column(name="resolution_note",length=1200) private String resolutionNote;
    @Column(name="created_by",nullable=false) private UUID createdBy;
    @Column(name="started_at") private Instant startedAt;
    @Column(name="resolved_at") private Instant resolvedAt;
    @Column(name="resolved_by") private UUID resolvedBy;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;

    @PrePersist void prePersist(){if(id==null)id=UUID.randomUUID();if(priority==null)priority="MEDIUM";if(status==null)status="OPEN";if(createdAt==null)createdAt=Instant.now();if(updatedAt==null)updatedAt=createdAt;}
    @PreUpdate void preUpdate(){updatedAt=Instant.now();}

    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getCinemaId(){return cinemaId;} public void setCinemaId(UUID v){cinemaId=v;}
    public UUID getAuditoriumId(){return auditoriumId;} public void setAuditoriumId(UUID v){auditoriumId=v;}
    public UUID getAssetId(){return assetId;} public void setAssetId(UUID v){assetId=v;}
    public UUID getSourceIncidentId(){return sourceIncidentId;} public void setSourceIncidentId(UUID v){sourceIncidentId=v;}
    public String getTitle(){return title;} public void setTitle(String v){title=v;}
    public String getDescription(){return description;} public void setDescription(String v){description=v;}
    public String getPriority(){return priority;} public void setPriority(String v){priority=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public UUID getAssignedTo(){return assignedTo;} public void setAssignedTo(UUID v){assignedTo=v;}
    public Instant getDueAt(){return dueAt;} public void setDueAt(Instant v){dueAt=v;}
    public String getResolutionNote(){return resolutionNote;} public void setResolutionNote(String v){resolutionNote=v;}
    public UUID getCreatedBy(){return createdBy;} public void setCreatedBy(UUID v){createdBy=v;}
    public Instant getStartedAt(){return startedAt;} public void setStartedAt(Instant v){startedAt=v;}
    public Instant getResolvedAt(){return resolvedAt;} public void setResolvedAt(Instant v){resolvedAt=v;}
    public UUID getResolvedBy(){return resolvedBy;} public void setResolvedBy(UUID v){resolvedBy=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
