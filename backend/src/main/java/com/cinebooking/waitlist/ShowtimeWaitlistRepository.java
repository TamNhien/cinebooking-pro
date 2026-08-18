package com.cinebooking.waitlist;

import com.cinebooking.domain.ShowtimeWaitlist;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.*;

public interface ShowtimeWaitlistRepository extends JpaRepository<ShowtimeWaitlist,UUID> {
    Optional<ShowtimeWaitlist> findByUserIdAndShowtimeId(UUID userId, UUID showtimeId);
    List<ShowtimeWaitlist> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<ShowtimeWaitlist> findByShowtimeIdAndStatus(UUID showtimeId, String status);

    @Query("select distinct w.showtimeId from ShowtimeWaitlist w where w.status='ACTIVE'")
    List<UUID> findDistinctActiveShowtimeIds();

    @Modifying
    @Query("update ShowtimeWaitlist w set w.status='NOTIFIED',w.notifiedAt=:now,w.lastAvailableCount=:count where w.id=:id and w.status='ACTIVE'")
    int claimNotification(@Param("id") UUID id,@Param("now") Instant now,@Param("count") int count);

    @Modifying
    @Query("update ShowtimeWaitlist w set w.status='ACTIVE',w.notifiedAt=null where w.id=:id and w.status='NOTIFIED'")
    int reactivate(@Param("id") UUID id);

    @Modifying
    @Query("update ShowtimeWaitlist w set w.status='EXPIRED' where w.showtimeId=:showtimeId and w.status='ACTIVE'")
    int expireActive(@Param("showtimeId") UUID showtimeId);
}
