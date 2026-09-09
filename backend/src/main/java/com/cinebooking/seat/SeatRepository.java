package com.cinebooking.seat;

import com.cinebooking.domain.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;

import java.util.*;

public interface SeatRepository extends JpaRepository<Seat, UUID> {
    List<Seat> findByAuditoriumIdOrderByRowLabelAscSeatNumberAsc(UUID auditoriumId);
    List<Seat> findByIdIn(List<UUID> ids);

    // V66: deterministic database row locks serialize all hold/checkout contenders, even across replicas.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Seat s where s.id in :ids order by s.id")
    List<Seat> findByIdInForUpdate(@Param("ids") List<UUID> ids);
    List<Seat> findAllByOrderByRowLabelAscSeatNumberAsc();
    boolean existsByAuditoriumId(UUID auditoriumId);
    long countByAuditoriumId(UUID auditoriumId);

    @Query(value = "SELECT COUNT(*) FROM seat s WHERE s.auditorium_id=:auditoriumId AND s.seat_type <> 'BLOCKED'", nativeQuery = true)
    long countSellableByAuditoriumId(@Param("auditoriumId") UUID auditoriumId);
    void deleteByAuditoriumId(UUID auditoriumId);
}
