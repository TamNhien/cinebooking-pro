package com.cinebooking.audit;

import com.cinebooking.domain.AuditLog;
import com.cinebooking.user.UserRepository;
import com.cinebooking.websocket.OperationsSignalPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class AuditService {
    private final AuditLogRepository logs;
    private final UserRepository users;
    private final OperationsSignalPublisher operationsSignals;

    public AuditService(AuditLogRepository logs, UserRepository users, OperationsSignalPublisher operationsSignals) {
        this.logs = logs;
        this.users = users;
        this.operationsSignals = operationsSignals;
    }

    @Transactional
    public void record(String email, String action, String entityType, String entityId, String details, String ip) {
        AuditLog l = new AuditLog();
        l.setActorEmail(email);
        l.setAction(action);
        l.setEntityType(entityType);
        l.setEntityId(entityId);
        l.setDetails(details);
        l.setIpAddress(ip);
        if (email != null) users.findByEmailIgnoreCase(email).ifPresent(u -> l.setActorUserId(u.getId()));
        logs.save(l);
        if (isOperationsSignal(action, entityType)) {
            operationsSignals.publish("AUDIT:" + action);
        }
    }

    private boolean isOperationsSignal(String action, String entityType) {
        if (action == null) return false;
        if (action.startsWith("OPS_ALERT_") || action.startsWith("ADMIN_")) return false;
        return action.startsWith("BOOKING_")
                || action.startsWith("PAYMENT_")
                || action.startsWith("REFUND_")
                || action.startsWith("MAINTENANCE_")
                || action.startsWith("SUPPORT_")
                || action.startsWith("SHIFT_")
                || action.startsWith("STAFF_")
                || action.startsWith("ATTENDANCE_")
                || action.startsWith("INVENTORY_")
                || "STAFF_INCIDENT".equals(entityType)
                || "CINEMA_EQUIPMENT_ASSET".equals(entityType)
                || "MAINTENANCE_WORK_ORDER".equals(entityType)
                || "CUSTOMER_SUPPORT_CASE".equals(entityType);
    }

    public List<AuditItem> recent() {
        return logs.findTop200ByOrderByCreatedAtDesc().stream()
                .map(x -> new AuditItem(x.getId(), x.getActorEmail(), x.getAction(), x.getEntityType(), x.getEntityId(), x.getDetails(), x.getIpAddress(), x.getCreatedAt().toString()))
                .toList();
    }

    public record AuditItem(UUID id, String actorEmail, String action, String entityType, String entityId, String details, String ipAddress, String createdAt) {}
}
