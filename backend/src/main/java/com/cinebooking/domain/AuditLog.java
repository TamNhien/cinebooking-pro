package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_log")
public class AuditLog {
    @Id private UUID id;
    @Column(name="actor_user_id") private UUID actorUserId;
    @Column(name="actor_email") private String actorEmail;
    @Column(nullable=false) private String action;
    @Column(name="entity_type") private String entityType;
    @Column(name="entity_id") private String entityId;
    private String details;
    @Column(name="ip_address") private String ipAddress;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @PrePersist void pre(){ if(id==null)id=UUID.randomUUID(); if(createdAt==null)createdAt=Instant.now(); }
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getActorUserId(){return actorUserId;} public void setActorUserId(UUID v){actorUserId=v;}
    public String getActorEmail(){return actorEmail;} public void setActorEmail(String v){actorEmail=v;}
    public String getAction(){return action;} public void setAction(String v){action=v;}
    public String getEntityType(){return entityType;} public void setEntityType(String v){entityType=v;}
    public String getEntityId(){return entityId;} public void setEntityId(String v){entityId=v;}
    public String getDetails(){return details;} public void setDetails(String v){details=v;}
    public String getIpAddress(){return ipAddress;} public void setIpAddress(String v){ipAddress=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
}
