package com.cinebooking.security;

import com.cinebooking.domain.TrustedDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface TrustedDeviceRepository extends JpaRepository<TrustedDevice, UUID> {
    Optional<TrustedDevice> findByUserIdAndDeviceFingerprint(UUID userId,String deviceFingerprint);
    List<TrustedDevice> findByUserIdOrderByLastSeenAtDesc(UUID userId);
    long countByUserIdAndRevokedAtIsNull(UUID userId);
    long countByRevokedAtIsNull();
}
