package com.cinebooking.seat;

import com.cinebooking.domain.Seat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface SeatRepository extends JpaRepository<Seat, UUID> {
    List<Seat> findByAuditoriumIdOrderByRowLabelAscSeatNumberAsc(UUID auditoriumId);
    List<Seat> findByIdIn(List<UUID> ids);
    List<Seat> findAllByOrderByRowLabelAscSeatNumberAsc();
    boolean existsByAuditoriumId(UUID auditoriumId);
    long countByAuditoriumId(UUID auditoriumId);
    void deleteByAuditoriumId(UUID auditoriumId);
}
