package com.cinebooking.movie;

import com.cinebooking.domain.AuditoriumBlackout;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface AuditoriumBlackoutRepository extends JpaRepository<AuditoriumBlackout, UUID> {
    List<AuditoriumBlackout> findAllByOrderByStartTimeAsc();
    List<AuditoriumBlackout> findByAuditoriumIdOrderByStartTimeAsc(UUID auditoriumId);
    List<AuditoriumBlackout> findByAuditoriumIdAndEndTimeAfterAndStartTimeBeforeOrderByStartTimeAsc(UUID auditoriumId, Instant startTime, Instant endTime);
}
