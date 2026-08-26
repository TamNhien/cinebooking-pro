package com.cinebooking.audit;
import com.cinebooking.domain.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {
    List<AuditLog> findTop200ByOrderByCreatedAtDesc();
    long countByAction(String action);
    List<AuditLog> findTop100ByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, String entityId);
    List<AuditLog> findTop100ByEntityTypeOrderByCreatedAtDesc(String entityType);
    List<AuditLog> findTop30ByActorEmailIgnoreCaseAndActionInOrderByCreatedAtDesc(String actorEmail, Collection<String> actions);
}

