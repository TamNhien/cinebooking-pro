package com.cinebooking.operations;

import com.cinebooking.domain.TicketCheckInLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.*;

public interface TicketCheckInLogRepository extends JpaRepository<TicketCheckInLog,UUID> {
    long countByShiftId(UUID shiftId);
    List<TicketCheckInLog> findTop50ByStaffUserIdOrderByCheckedInAtDesc(UUID staffUserId);
    List<TicketCheckInLog> findTop100ByShiftIdOrderByCheckedInAtDesc(UUID shiftId);
    List<TicketCheckInLog> findTop20ByCinemaIdOrderByCheckedInAtDesc(UUID cinemaId);
    long countByCinemaIdAndCheckedInAtBetween(UUID cinemaId, Instant from, Instant to);
}
