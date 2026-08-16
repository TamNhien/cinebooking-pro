package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "auth_session")
public class AuthSession {
    @Id private UUID id;
    @Column(name="user_id", nullable=false) private UUID userId;
    @Column(name="refresh_token_hash", nullable=false, unique=true, length=64) private String refreshTokenHash;
    @Column(name="device_name", nullable=false, length=160) private String deviceName;
    @Column(name="user_agent", length=500) private String userAgent;
    @Column(name="ip_address", length=80) private String ipAddress;
    @Column(name="created_at", nullable=false) private Instant createdAt;
    @Column(name="last_seen_at", nullable=false) private Instant lastSeenAt;
    @Column(name="expires_at", nullable=false) private Instant expiresAt;
    @Column(name="revoked_at") private Instant revokedAt;
    @Column(name="revoke_reason", length=120) private String revokeReason;

    @PrePersist void pre(){
        if(id==null) id=UUID.randomUUID();
        if(createdAt==null) createdAt=Instant.now();
        if(lastSeenAt==null) lastSeenAt=createdAt;
    }

    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;}
    public String getRefreshTokenHash(){return refreshTokenHash;} public void setRefreshTokenHash(String v){refreshTokenHash=v;}
    public String getDeviceName(){return deviceName;} public void setDeviceName(String v){deviceName=v;}
    public String getUserAgent(){return userAgent;} public void setUserAgent(String v){userAgent=v;}
    public String getIpAddress(){return ipAddress;} public void setIpAddress(String v){ipAddress=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Instant getLastSeenAt(){return lastSeenAt;} public void setLastSeenAt(Instant v){lastSeenAt=v;}
    public Instant getExpiresAt(){return expiresAt;} public void setExpiresAt(Instant v){expiresAt=v;}
    public Instant getRevokedAt(){return revokedAt;} public void setRevokedAt(Instant v){revokedAt=v;}
    public String getRevokeReason(){return revokeReason;} public void setRevokeReason(String v){revokeReason=v;}
    public boolean active(){return revokedAt==null && expiresAt!=null && expiresAt.isAfter(Instant.now());}
}
