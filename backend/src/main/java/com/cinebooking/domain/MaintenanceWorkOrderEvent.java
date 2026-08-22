package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="maintenance_work_order_event")
public class MaintenanceWorkOrderEvent {
    @Id private UUID id;
    @Column(name="work_order_id",nullable=false) private UUID workOrderId;
    @Column(name="event_type",nullable=false,length=30) private String eventType;
    @Column(name="from_status",length=24) private String fromStatus;
    @Column(name="to_status",length=24) private String toStatus;
    @Column(length=1200) private String note;
    @Column(name="actor_user_id",nullable=false) private UUID actorUserId;
    @Column(name="created_at",nullable=false) private Instant createdAt;

    @PrePersist void prePersist(){if(id==null)id=UUID.randomUUID();if(createdAt==null)createdAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getWorkOrderId(){return workOrderId;} public void setWorkOrderId(UUID v){workOrderId=v;}
    public String getEventType(){return eventType;} public void setEventType(String v){eventType=v;}
    public String getFromStatus(){return fromStatus;} public void setFromStatus(String v){fromStatus=v;}
    public String getToStatus(){return toStatus;} public void setToStatus(String v){toStatus=v;}
    public String getNote(){return note;} public void setNote(String v){note=v;}
    public UUID getActorUserId(){return actorUserId;} public void setActorUserId(UUID v){actorUserId=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
}
