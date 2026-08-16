package com.cinebooking.auth;

import com.cinebooking.domain.AuthSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface AuthSessionRepository extends JpaRepository<AuthSession, UUID> {
    Optional<AuthSession> findByRefreshTokenHash(String hash);
    List<AuthSession> findByUserIdOrderByLastSeenAtDesc(UUID userId);
    List<AuthSession> findTop50ByUserIdOrderByLastSeenAtDesc(UUID userId);
    List<AuthSession> findTop500ByOrderByLastSeenAtDesc();
}
