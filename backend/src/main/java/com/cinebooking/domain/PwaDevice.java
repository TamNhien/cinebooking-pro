package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="pwa_device", uniqueConstraints=@UniqueConstraint(name="uq_pwa_device_key",columnNames="device_key"))
public class PwaDevice {
    @Id private UUID id;
    @Column(name="user_id",nullable=false) private UUID userId;
    @Column(name="device_key",nullable=false,length=80) private String deviceKey;
    @Column(name="device_label",nullable=false,length=160) private String deviceLabel;
    @Column(nullable=false,length=40) private String platform;
    @Column(name="user_agent",length=500) private String userAgent;
    @Column(nullable=false) private Boolean standalone;
    @Column(name="push_enabled",nullable=false) private Boolean pushEnabled;
    @Column(name="push_endpoint",columnDefinition="TEXT") private String pushEndpoint;
    @Column(columnDefinition="TEXT") private String p256dh;
    @Column(name="auth_secret",columnDefinition="TEXT") private String authSecret;
    @Column(name="failure_count",nullable=false) private Integer failureCount;
    @Column(name="last_seen_at",nullable=false) private Instant lastSeenAt;
    @Column(name="last_push_at") private Instant lastPushAt;
    @Column(name="last_failure_at") private Instant lastFailureAt;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;

    @PrePersist void prePersist(){
        Instant now=Instant.now();
        if(id==null)id=UUID.randomUUID();
        if(platform==null||platform.isBlank())platform="WEB";
        if(standalone==null)standalone=false;
        if(pushEnabled==null)pushEnabled=false;
        if(failureCount==null)failureCount=0;
        if(lastSeenAt==null)lastSeenAt=now;
        if(createdAt==null)createdAt=now;
        if(updatedAt==null)updatedAt=now;
    }
    @PreUpdate void preUpdate(){updatedAt=Instant.now();}

    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;}
    public String getDeviceKey(){return deviceKey;} public void setDeviceKey(String v){deviceKey=v;}
    public String getDeviceLabel(){return deviceLabel;} public void setDeviceLabel(String v){deviceLabel=v;}
    public String getPlatform(){return platform;} public void setPlatform(String v){platform=v;}
    public String getUserAgent(){return userAgent;} public void setUserAgent(String v){userAgent=v;}
    public Boolean getStandalone(){return standalone;} public void setStandalone(Boolean v){standalone=v;}
    public Boolean getPushEnabled(){return pushEnabled;} public void setPushEnabled(Boolean v){pushEnabled=v;}
    public String getPushEndpoint(){return pushEndpoint;} public void setPushEndpoint(String v){pushEndpoint=v;}
    public String getP256dh(){return p256dh;} public void setP256dh(String v){p256dh=v;}
    public String getAuthSecret(){return authSecret;} public void setAuthSecret(String v){authSecret=v;}
    public Integer getFailureCount(){return failureCount;} public void setFailureCount(Integer v){failureCount=v;}
    public Instant getLastSeenAt(){return lastSeenAt;} public void setLastSeenAt(Instant v){lastSeenAt=v;}
    public Instant getLastPushAt(){return lastPushAt;} public void setLastPushAt(Instant v){lastPushAt=v;}
    public Instant getLastFailureAt(){return lastFailureAt;} public void setLastFailureAt(Instant v){lastFailureAt=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
