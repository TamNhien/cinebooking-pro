package com.cinebooking.notification;

import com.cinebooking.domain.UserNotification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.*;

public interface NotificationRepository extends JpaRepository<UserNotification,UUID>{
    List<UserNotification> findTop100ByUserIdAndInAppVisibleTrueAndArchivedAtIsNullOrderByCreatedAtDesc(UUID userId);
    List<UserNotification> findTop100ByUserIdAndInAppVisibleTrueAndArchivedAtIsNotNullOrderByArchivedAtDesc(UUID userId);
    List<UserNotification> findTop20ByUserIdAndArchivedAtIsNullAndCreatedAtAfterOrderByCreatedAtAsc(UUID userId, Instant after);
    long countByUserIdAndInAppVisibleTrueAndArchivedAtIsNullAndReadFalse(UUID userId);
    long countByUserIdAndInAppVisibleTrueAndArchivedAtIsNullAndReadFalseAndPriority(UUID userId,String priority);
    long countByUserIdAndInAppVisibleTrueAndArchivedAtIsNotNull(UUID userId);
    Optional<UserNotification> findByIdAndUserId(UUID id,UUID userId);
    boolean existsByUserIdAndDedupeKey(UUID userId,String dedupeKey);
    Optional<UserNotification> findByUserIdAndDedupeKey(UUID userId,String dedupeKey);
    @Modifying
    @Query(value="""
        insert into user_notification(id,user_id,notification_type,title,message,link_url,is_read,created_at,category,priority,in_app_visible,email_status,dedupe_key)
        values (:id,:userId,:type,:title,:message,:linkUrl,false,current_timestamp,:category,:priority,:visible,:emailStatus,:dedupeKey)
        on conflict (user_id,dedupe_key) where dedupe_key is not null do nothing
        """, nativeQuery=true)
    int insertOnce(@Param("id") UUID id,@Param("userId") UUID userId,@Param("type") String type,@Param("title") String title,@Param("message") String message,@Param("linkUrl") String linkUrl,@Param("category") String category,@Param("priority") String priority,@Param("visible") boolean visible,@Param("emailStatus") String emailStatus,@Param("dedupeKey") String dedupeKey);
    @Modifying @Query("update UserNotification n set n.read=true,n.readAt=coalesce(n.readAt,:now) where n.userId=:userId and n.inAppVisible=true and n.archivedAt is null and n.read=false")
    int markAllRead(@Param("userId") UUID userId,@Param("now") Instant now);
}
