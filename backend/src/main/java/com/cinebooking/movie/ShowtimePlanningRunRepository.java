package com.cinebooking.movie;

import com.cinebooking.domain.ShowtimePlanningRun;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface ShowtimePlanningRunRepository extends JpaRepository<ShowtimePlanningRun, UUID> {
    List<ShowtimePlanningRun> findTop20ByOrderByCreatedAtDesc();
    List<ShowtimePlanningRun> findTop20ByCinemaIdOrderByCreatedAtDesc(UUID cinemaId);
}
