package com.cinebooking.movie;
import com.cinebooking.domain.Auditorium;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface AuditoriumRepository extends JpaRepository<Auditorium, UUID> {
 List<Auditorium> findAllByOrderByNameAsc();
 List<Auditorium> findByCinemaIdOrderByNameAsc(UUID cinemaId);
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select a from Auditorium a where a.id=:id") Optional<Auditorium> findByIdForUpdate(@Param("id") UUID id);
}
