package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="customer_support_case_event")
public class CustomerSupportCaseEvent {
    @Id private UUID id;
    @Column(name="case_id",nullable=false) private UUID caseId;
    @Column(name="event_type",nullable=false,length=32) private String eventType;
    @Column(name="from_status",length=24) private String fromStatus;
    @Column(name="to_status",length=24) private String toStatus;
    @Column(nullable=false,length=16) private String visibility;
    @Column(length=3000) private String message;
    @Column(name="actor_user_id",nullable=false) private UUID actorUserId;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(visibility==null)visibility="CUSTOMER";if(createdAt==null)createdAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;} public UUID getCaseId(){return caseId;} public void setCaseId(UUID v){caseId=v;}
    public String getEventType(){return eventType;} public void setEventType(String v){eventType=v;} public String getFromStatus(){return fromStatus;} public void setFromStatus(String v){fromStatus=v;}
    public String getToStatus(){return toStatus;} public void setToStatus(String v){toStatus=v;} public String getVisibility(){return visibility;} public void setVisibility(String v){visibility=v;}
    public String getMessage(){return message;} public void setMessage(String v){message=v;} public UUID getActorUserId(){return actorUserId;} public void setActorUserId(UUID v){actorUserId=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
}
