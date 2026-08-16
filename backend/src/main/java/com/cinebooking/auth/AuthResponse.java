package com.cinebooking.auth;
import java.time.Instant;
public record AuthResponse(String accessToken, Instant accessExpiresAt, String sessionId, String userId, String email, String fullName, String role) {}
