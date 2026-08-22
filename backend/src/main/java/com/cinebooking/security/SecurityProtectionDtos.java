package com.cinebooking.security;

import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class SecurityProtectionDtos {
    private SecurityProtectionDtos(){}
    public record SecurityOverview(long activeSessions,long trustedDevices,long unacknowledgedAlerts,long highRiskAlerts,Instant generatedAt){}
    public record TrustedDeviceView(UUID id,String label,String deviceName,String firstIp,String lastIp,Instant trustedAt,Instant lastSeenAt,Instant revokedAt,boolean active){}
    public record SecurityAlertView(UUID id,String eventType,String severity,int riskScore,String title,String details,String ipAddress,String deviceName,UUID relatedSessionId,Instant acknowledgedAt,Instant createdAt){}
    public record TrustCurrentDeviceRequest(@Size(max=160) String label){}
    public record AdminSecuritySummary(long alertsLast24Hours,long unacknowledgedAlerts,long unacknowledgedHighRisk,long activeTrustedDevices,Instant generatedAt){}
    public record AdminSecurityAlertView(UUID id,UUID userId,String userEmail,String userName,String eventType,String severity,int riskScore,String title,String details,String ipAddress,String deviceName,UUID relatedSessionId,Instant acknowledgedAt,Instant createdAt){}
}
