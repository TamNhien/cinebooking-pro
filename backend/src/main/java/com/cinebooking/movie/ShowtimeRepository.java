package com.cinebooking.movie;
import com.cinebooking.domain.Showtime;import com.cinebooking.domain.ShowtimeStatus;import org.springframework.data.jpa.repository.JpaRepository;import java.time.Instant;import java.util.*;
public interface ShowtimeRepository extends JpaRepository<Showtime, UUID> {
    List<Showtime> findByMovieIdAndStatusAndStartTimeAfterOrderByStartTimeAsc(UUID movieId, ShowtimeStatus status, Instant now);
    List<Showtime> findByStatusAndStartTimeAfterOrderByStartTimeAsc(ShowtimeStatus status, Instant now);
    List<Showtime> findAllByOrderByStartTimeDesc();
    boolean existsByAuditoriumId(UUID auditoriumId);
}
