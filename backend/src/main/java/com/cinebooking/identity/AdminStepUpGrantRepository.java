package com.cinebooking.identity;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface AdminStepUpGrantRepository extends JpaRepository<AdminStepUpGrant, UUID> {
    Optional<AdminStepUpGrant> findByTokenHash(String tokenHash);
    long countByRevokedAtIsNullAndExpiresAtAfter(Instant now);

    @Modifying
    @Query("update AdminStepUpGrant g set g.revokedAt=:now, g.revokeReason=:reason where g.sessionId=:sessionId and g.revokedAt is null and g.expiresAt>:now")
    int revokeActiveForSession(@Param("sessionId") UUID sessionId, @Param("now") Instant now, @Param("reason") String reason);
}
