package com.cinebooking.identity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class StepUpDtos {
    private StepUpDtos() {}
    public record StepUpRequest(@NotBlank @Size(max=300) String password) {}
    public record StepUpGrantResponse(String token, Instant issuedAt, Instant expiresAt, long ttlSeconds, String strategyVersion) {}
    public record StepUpStatusResponse(boolean enabled, boolean active, Instant expiresAt, long ttlSeconds, String strategyVersion) {}
    public record AdminIdentitySecuritySummary(String strategyVersion, boolean stepUpEnabled, long stepUpTtlSeconds,
                                               long activeStepUpGrants, int protectedActionGroups,
                                               String tokenStorage, String cspMode, boolean hstsWhenHttps,
                                               Instant generatedAt) {}
}
