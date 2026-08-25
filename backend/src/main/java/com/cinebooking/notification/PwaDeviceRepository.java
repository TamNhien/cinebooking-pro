package com.cinebooking.notification;

import com.cinebooking.domain.PwaDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface PwaDeviceRepository extends JpaRepository<PwaDevice,UUID> {
    Optional<PwaDevice> findByDeviceKey(String deviceKey);
    Optional<PwaDevice> findByPushEndpoint(String pushEndpoint);
    List<PwaDevice> findByUserIdOrderByLastSeenAtDesc(UUID userId);
    List<PwaDevice> findByUserIdAndPushEnabledTrueOrderByLastSeenAtDesc(UUID userId);
    long countByUserIdAndPushEnabledTrue(UUID userId);
}
