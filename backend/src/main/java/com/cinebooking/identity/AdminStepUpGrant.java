package com.cinebooking.identity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "admin_step_up_grant")
public class AdminStepUpGrant {
    @Id private UUID id;
    @Column(name="user_id", nullable=false) private UUID userId;
    @Column(name="session_id", nullable=false) private UUID sessionId;
    @Column(name="token_hash", nullable=false, unique=true, length=64) private String tokenHash;
    @Column(name="issued_at", nullable=false) private Instant issuedAt;
    @Column(name="expires_at", nullable=false) private Instant expiresAt;
    @Column(name="last_used_at") private Instant lastUsedAt;
    @Column(name="revoked_at") private Instant revokedAt;
    @Column(name="revoke_reason", length=120) private String revokeReason;

    @PrePersist void prePersist(){
        if(id==null) id=UUID.randomUUID();
        if(issuedAt==null) issuedAt=Instant.now();
    }

    public boolean active(){ return revokedAt==null && expiresAt!=null && expiresAt.isAfter(Instant.now()); }
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;}
    public UUID getSessionId(){return sessionId;} public void setSessionId(UUID v){sessionId=v;}
    public String getTokenHash(){return tokenHash;} public void setTokenHash(String v){tokenHash=v;}
    public Instant getIssuedAt(){return issuedAt;} public void setIssuedAt(Instant v){issuedAt=v;}
    public Instant getExpiresAt(){return expiresAt;} public void setExpiresAt(Instant v){expiresAt=v;}
    public Instant getLastUsedAt(){return lastUsedAt;} public void setLastUsedAt(Instant v){lastUsedAt=v;}
    public Instant getRevokedAt(){return revokedAt;} public void setRevokedAt(Instant v){revokedAt=v;}
    public String getRevokeReason(){return revokeReason;} public void setRevokeReason(String v){revokeReason=v;}
}
