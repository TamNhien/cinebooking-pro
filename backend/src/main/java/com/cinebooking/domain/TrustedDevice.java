package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="trusted_device", uniqueConstraints=@UniqueConstraint(name="uq_trusted_device_user_fingerprint", columnNames={"user_id","device_fingerprint"}))
public class TrustedDevice {
    @Id private UUID id;
    @Column(name="user_id",nullable=false) private UUID userId;
    @Column(name="device_fingerprint",nullable=false,length=64) private String deviceFingerprint;
    @Column(nullable=false,length=160) private String label;
    @Column(name="device_name",nullable=false,length=160) private String deviceName;
    @Column(name="user_agent",length=500) private String userAgent;
    @Column(name="first_ip",length=80) private String firstIp;
    @Column(name="last_ip",length=80) private String lastIp;
    @Column(name="trusted_at",nullable=false) private Instant trustedAt;
    @Column(name="last_seen_at",nullable=false) private Instant lastSeenAt;
    @Column(name="revoked_at") private Instant revokedAt;

    @PrePersist void pre(){Instant now=Instant.now();if(id==null)id=UUID.randomUUID();if(trustedAt==null)trustedAt=now;if(lastSeenAt==null)lastSeenAt=now;}

    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;}
    public String getDeviceFingerprint(){return deviceFingerprint;} public void setDeviceFingerprint(String v){deviceFingerprint=v;}
    public String getLabel(){return label;} public void setLabel(String v){label=v;}
    public String getDeviceName(){return deviceName;} public void setDeviceName(String v){deviceName=v;}
    public String getUserAgent(){return userAgent;} public void setUserAgent(String v){userAgent=v;}
    public String getFirstIp(){return firstIp;} public void setFirstIp(String v){firstIp=v;}
    public String getLastIp(){return lastIp;} public void setLastIp(String v){lastIp=v;}
    public Instant getTrustedAt(){return trustedAt;} public void setTrustedAt(Instant v){trustedAt=v;}
    public Instant getLastSeenAt(){return lastSeenAt;} public void setLastSeenAt(Instant v){lastSeenAt=v;}
    public Instant getRevokedAt(){return revokedAt;} public void setRevokedAt(Instant v){revokedAt=v;}
    public boolean active(){return revokedAt==null;}
}
