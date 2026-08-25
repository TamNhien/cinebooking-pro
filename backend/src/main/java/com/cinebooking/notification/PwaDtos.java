package com.cinebooking.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class PwaDtos {
    private PwaDtos(){}
    public record PushConfig(boolean enabled,String vapidPublicKey,int ttlSeconds,String deliveryMode){}
    public record DeviceRegistration(
        @NotBlank @Size(max=160) String deviceLabel,
        @NotBlank @Size(max=40) String platform,
        @Size(max=500) String userAgent,
        @NotNull Boolean standalone,
        @NotNull Boolean pushEnabled,
        @Size(max=2048) String endpoint,
        @Size(max=256) String p256dh,
        @Size(max=128) String authSecret
    ){}
    public record DeviceResponse(UUID id,String deviceKey,String deviceLabel,String platform,boolean standalone,boolean pushEnabled,int failureCount,Instant lastSeenAt,Instant lastPushAt,Instant lastFailureAt,Instant createdAt,Instant updatedAt,boolean current){}
}
