package com.cinebooking.seat;

import com.cinebooking.domain.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.*;

public interface SeatRepository extends JpaRepository<Seat, UUID> {
    List<Seat> findByAuditoriumIdOrderByRowLabelAscSeatNumberAsc(UUID auditoriumId);
    List<Seat> findByIdIn(List<UUID> ids);
    List<Seat> findAllByOrderByRowLabelAscSeatNumberAsc();
    boolean existsByAuditoriumId(UUID auditoriumId);
    long countByAuditoriumId(UUID auditoriumId);

    @Query(value = "SELECT COUNT(*) FROM seat s WHERE s.auditorium_id=:auditoriumId AND s.seat_type <> 'BLOCKED'", nativeQuery = true)
    long countSellableByAuditoriumId(@Param("auditoriumId") UUID auditoriumId);
    void deleteByAuditoriumId(UUID auditoriumId);
}
