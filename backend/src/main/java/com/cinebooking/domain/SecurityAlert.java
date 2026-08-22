package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="security_alert")
public class SecurityAlert {
    @Id private UUID id;
    @Column(name="user_id",nullable=false) private UUID userId;
    @Column(name="event_type",nullable=false,length=32) private String eventType;
    @Column(nullable=false,length=16) private String severity;
    @Column(name="risk_score",nullable=false) private Integer riskScore;
    @Column(nullable=false,length=180) private String title;
    @Column(length=1000) private String details;
    @Column(name="ip_address",length=80) private String ipAddress;
    @Column(name="device_name",length=160) private String deviceName;
    @Column(name="related_session_id") private UUID relatedSessionId;
    @Column(name="acknowledged_at") private Instant acknowledgedAt;
    @Column(name="acknowledged_by") private UUID acknowledgedBy;
    @Column(name="created_at",nullable=false) private Instant createdAt;

    @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(createdAt==null)createdAt=Instant.now();}

    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;}
    public String getEventType(){return eventType;} public void setEventType(String v){eventType=v;}
    public String getSeverity(){return severity;} public void setSeverity(String v){severity=v;}
    public Integer getRiskScore(){return riskScore;} public void setRiskScore(Integer v){riskScore=v;}
    public String getTitle(){return title;} public void setTitle(String v){title=v;}
    public String getDetails(){return details;} public void setDetails(String v){details=v;}
    public String getIpAddress(){return ipAddress;} public void setIpAddress(String v){ipAddress=v;}
    public String getDeviceName(){return deviceName;} public void setDeviceName(String v){deviceName=v;}
    public UUID getRelatedSessionId(){return relatedSessionId;} public void setRelatedSessionId(UUID v){relatedSessionId=v;}
    public Instant getAcknowledgedAt(){return acknowledgedAt;} public void setAcknowledgedAt(Instant v){acknowledgedAt=v;}
    public UUID getAcknowledgedBy(){return acknowledgedBy;} public void setAcknowledgedBy(UUID v){acknowledgedBy=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
}
