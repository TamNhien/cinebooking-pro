package com.cinebooking.auth;

import java.time.Instant;
import java.util.UUID;

public final class SecurityDtos {
    private SecurityDtos() {}
    public record SessionView(UUID id, String deviceName, String ipAddress, Instant createdAt, Instant lastSeenAt, Instant expiresAt, Instant revokedAt, String revokeReason, boolean current, boolean active) {}
    public record LoginEventView(String action, String details, String ipAddress, Instant createdAt) {}
}
