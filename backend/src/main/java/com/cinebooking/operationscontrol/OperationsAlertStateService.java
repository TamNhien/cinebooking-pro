package com.cinebooking.operationscontrol;

import com.cinebooking.audit.AuditLogRepository;
import com.cinebooking.audit.AuditService;
import com.cinebooking.websocket.OperationsSignalPublisher;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

import static com.cinebooking.operationscontrol.OperationsControlCenterDtos.*;

@Service
public class OperationsAlertStateService {
    private static final String KEY_PREFIX = "cinebooking:ops-alert:";
    private static final Duration STATE_TTL = Duration.ofHours(24);
    private static final Duration ACK_WINDOW = Duration.ofMinutes(60);
    private static final Duration RESOLVE_COOLDOWN = Duration.ofMinutes(15);
    private static final Duration ESCALATE_AFTER = Duration.ofMinutes(10);
    private static final Duration REAPPEAR_GAP = Duration.ofSeconds(90);

    private final StringRedisTemplate redis;
    private final AuditService audit;
    private final AuditLogRepository auditLogs;
    private final OperationsSignalPublisher signals;

    public OperationsAlertStateService(StringRedisTemplate redis,
                                       AuditService audit,
                                       AuditLogRepository auditLogs,
                                       OperationsSignalPublisher signals) {
        this.redis = redis;
        this.audit = audit;
        this.auditLogs = auditLogs;
        this.signals = signals;
    }

    public List<AlertItem> decorate(List<AlertItem> rawAlerts) {
        Instant now = Instant.now();
        return rawAlerts.stream().map(alert -> decorate(alert, now)).toList();
    }

    public AlertItem decorate(AlertItem alert, Instant now) {
        String key = key(alert.fingerprint());
        try {
            var hash = redis.opsForHash();
            String firstRaw = string(hash.get(key, "firstSeenAt"));
            Instant firstSeen = parse(firstRaw, now);
            if (firstRaw == null) {
                hash.put(key, "firstSeenAt", firstSeen.toString());
                hash.put(key, "state", "OPEN");
                redis.expire(key, STATE_TTL);
            }

            String state = optional(string(hash.get(key, "state")), "OPEN");
            Instant changedAt = parseNullable(string(hash.get(key, "stateChangedAt")));
            String actor = string(hash.get(key, "stateActor"));
            Instant lastSeen = parseNullable(string(hash.get(key, "lastSeenAt")));
            if ("OPEN".equals(state) && lastSeen != null && lastSeen.plus(REAPPEAR_GAP).isBefore(now)) {
                firstSeen = now;
                hash.put(key, "firstSeenAt", firstSeen.toString());
            }
            hash.put(key, "lastSeenAt", now.toString());

            if ("ACKNOWLEDGED".equals(state) && changedAt != null && changedAt.plus(ACK_WINDOW).isBefore(now)) {
                state = "OPEN";
                actor = null;
                changedAt = null;
                hash.put(key, "state", state);
                hash.delete(key, "stateActor", "stateChangedAt");
            } else if ("RESOLVED".equals(state) && changedAt != null && changedAt.plus(RESOLVE_COOLDOWN).isBefore(now)) {
                state = "OPEN";
                actor = null;
                changedAt = null;
                firstSeen = now;
                hash.put(key, "state", state);
                hash.put(key, "firstSeenAt", firstSeen.toString());
                hash.delete(key, "stateActor", "stateChangedAt");
            }

            String effective = alert.severity();
            boolean escalated = false;
            if ("OPEN".equals(state) && !firstSeen.plus(ESCALATE_AFTER).isAfter(now)) {
                effective = escalate(effective);
                escalated = !effective.equals(alert.severity());
            }
            redis.expire(key, STATE_TTL);
            return new AlertItem(alert.fingerprint(), alert.severity(), effective, state, alert.domain(), alert.title(), alert.detail(), alert.count(), alert.href(), firstSeen, changedAt, actor, escalated);
        } catch (RuntimeException ignored) {
            return new AlertItem(alert.fingerprint(), alert.severity(), alert.severity(), "OPEN", alert.domain(), alert.title(), alert.detail(), alert.count(), alert.href(), now, null, null, false);
        }
    }

    public void acknowledge(AlertItem alert, String actorEmail, String note) {
        transition(alert, actorEmail, note, "ACKNOWLEDGED", "OPS_ALERT_ACKNOWLEDGE");
    }

    public void resolve(AlertItem alert, String actorEmail, String note) {
        transition(alert, actorEmail, note, "RESOLVED", "OPS_ALERT_RESOLVE");
    }

    private void transition(AlertItem alert, String actorEmail, String note, String state, String action) {
        Instant now = Instant.now();
        String key = key(alert.fingerprint());
        var hash = redis.opsForHash();
        if (hash.get(key, "firstSeenAt") == null) hash.put(key, "firstSeenAt", now.toString());
        hash.put(key, "state", state);
        hash.put(key, "stateChangedAt", now.toString());
        hash.put(key, "stateActor", actorEmail == null ? "system" : actorEmail);
        redis.expire(key, STATE_TTL);

        String detail = alert.domain() + " · " + alert.title() + " · count=" + alert.count();
        if (note != null && !note.isBlank()) detail += " · " + trim(note, 300);
        audit.record(actorEmail, action, "OPERATIONS_ALERT", alert.fingerprint(), detail, null);
        signals.publish(action);
    }

    public List<AlertHistoryItem> history(Set<String> visibleFingerprints) {
        if (visibleFingerprints == null || visibleFingerprints.isEmpty()) return List.of();
        return auditLogs.findTop100ByEntityTypeOrderByCreatedAtDesc("OPERATIONS_ALERT").stream()
                .filter(x -> x.getEntityId() != null && visibleFingerprints.contains(x.getEntityId()))
                .filter(x -> x.getAction() != null && x.getAction().startsWith("OPS_ALERT_"))
                .limit(30)
                .map(x -> new AlertHistoryItem(x.getId(), x.getEntityId(), x.getAction(), x.getActorEmail(), x.getDetails(), x.getCreatedAt()))
                .toList();
    }

    private String escalate(String severity) {
        return switch (severity) {
            case "HIGH" -> "CRITICAL";
            case "MEDIUM" -> "HIGH";
            case "LOW" -> "MEDIUM";
            default -> severity;
        };
    }

    private String key(String fingerprint) { return KEY_PREFIX + fingerprint; }
    private String string(Object value) { return value == null ? null : String.valueOf(value); }
    private String optional(String value, String fallback) { return value == null || value.isBlank() ? fallback : value; }
    private Instant parse(String value, Instant fallback) { try { return value == null ? fallback : Instant.parse(value); } catch (RuntimeException e) { return fallback; } }
    private Instant parseNullable(String value) { try { return value == null ? null : Instant.parse(value); } catch (RuntimeException e) { return null; } }
    private String trim(String value, int max) { String v = value.trim(); return v.length() <= max ? v : v.substring(0, max); }
}
