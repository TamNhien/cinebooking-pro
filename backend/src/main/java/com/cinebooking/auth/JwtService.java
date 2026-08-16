package com.cinebooking.auth;

import com.cinebooking.common.ApiException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {
    private final byte[] secret;
    private final String issuer;
    private final long ttlSeconds;
    private final ObjectMapper mapper;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.issuer}") String issuer,
                      @Value("${app.jwt.ttl-minutes}") long ttlMinutes,
                      ObjectMapper mapper) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET is required");
        }
        if ("change-this-to-a-long-random-secret-at-least-32-characters".equals(secret)) {
            throw new IllegalStateException("JWT_SECRET must not use the example/default value");
        }
        if (secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes");
        }
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.issuer = issuer;
        this.ttlSeconds = ttlMinutes * 60;
        this.mapper = mapper;
    }

    public Token create(String subject, String role, UUID sessionId) {
        try {
            String header = base64Url(mapper.writeValueAsBytes(Map.of("alg", "HS256", "typ", "JWT")));
            Instant now = Instant.now();
            Instant expiresAt = now.plusSeconds(ttlSeconds);
            Map<String,Object> payloadMap = new LinkedHashMap<>();
            payloadMap.put("iss", issuer);
            payloadMap.put("sub", subject);
            payloadMap.put("role", role);
            payloadMap.put("sid", sessionId.toString());
            payloadMap.put("jti", UUID.randomUUID().toString());
            payloadMap.put("iat", now.getEpochSecond());
            payloadMap.put("exp", expiresAt.getEpochSecond());
            String payload = base64Url(mapper.writeValueAsBytes(payloadMap));
            String unsigned = header + "." + payload;
            return new Token(unsigned + "." + base64Url(hmac(unsigned)), expiresAt);
        } catch (Exception e) {
            throw new IllegalStateException("Cannot create token", e);
        }
    }

    public Claims verify(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) throw new ApiException(HttpStatus.UNAUTHORIZED, "Token không hợp lệ");
            byte[] expected = hmac(parts[0] + "." + parts[1]);
            byte[] actual = Base64.getUrlDecoder().decode(parts[2]);
            if (!MessageDigest.isEqual(expected, actual)) throw new ApiException(HttpStatus.UNAUTHORIZED, "Token không hợp lệ");
            JsonNode payload = mapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
            if (!issuer.equals(payload.path("iss").asText())) throw new ApiException(HttpStatus.UNAUTHORIZED, "Token sai issuer");
            long exp = payload.path("exp").asLong(0);
            if (Instant.now().getEpochSecond() >= exp) throw new ApiException(HttpStatus.UNAUTHORIZED, "Token đã hết hạn");
            String sid = payload.path("sid").asText();
            if (sid.isBlank()) throw new ApiException(HttpStatus.UNAUTHORIZED, "Token thiếu session id");
            return new Claims(payload.path("sub").asText(), payload.path("role").asText(), UUID.fromString(sid), exp);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Token không hợp lệ");
        }
    }

    private byte[] hmac(String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret, "HmacSHA256"));
        return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    }
    private String base64Url(byte[] bytes) { return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    public record Token(String value, Instant expiresAt) {}
    public record Claims(String subject, String role, UUID sessionId, long exp) {}
}
