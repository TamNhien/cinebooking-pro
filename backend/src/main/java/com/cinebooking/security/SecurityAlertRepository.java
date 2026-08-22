package com.cinebooking.security;

import com.cinebooking.domain.SecurityAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.*;

public interface SecurityAlertRepository extends JpaRepository<SecurityAlert, UUID> {
    List<SecurityAlert> findTop100ByUserIdOrderByCreatedAtDesc(UUID userId);
    List<SecurityAlert> findTop200ByOrderByCreatedAtDesc();
    List<SecurityAlert> findByRelatedSessionId(UUID relatedSessionId);
    long countByUserIdAndAcknowledgedAtIsNull(UUID userId);
    long countByUserIdAndAcknowledgedAtIsNullAndSeverityIn(UUID userId, Collection<String> severities);
    long countByAcknowledgedAtIsNullAndSeverityIn(Collection<String> severities);
    long countByCreatedAtAfter(Instant after);
    long countByAcknowledgedAtIsNull();
}
