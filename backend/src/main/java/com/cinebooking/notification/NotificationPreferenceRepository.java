package com.cinebooking.notification;

import com.cinebooking.domain.NotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, UUID> {}
