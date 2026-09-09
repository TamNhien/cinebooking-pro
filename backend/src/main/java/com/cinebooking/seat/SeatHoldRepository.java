package com.cinebooking.seat;

import com.cinebooking.domain.SeatHoldRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface SeatHoldRepository extends JpaRepository<SeatHoldRecord, UUID> {
    @Query(value="""
        SELECT * FROM seat_hold
        WHERE showtime_id=:showtimeId AND seat_id IN (:seatIds)
          AND state='HELD' AND expires_at>:now
        ORDER BY seat_id
        """,nativeQuery=true)
    List<SeatHoldRecord> findActiveForSeats(@Param("showtimeId") UUID showtimeId,
                                            @Param("seatIds") List<UUID> seatIds,
                                            @Param("now") Instant now);

    @Query(value="""
        SELECT * FROM seat_hold
        WHERE showtime_id=:showtimeId AND state='HELD' AND expires_at>:now
        ORDER BY seat_id
        """,nativeQuery=true)
    List<SeatHoldRecord> findActiveByShowtime(@Param("showtimeId") UUID showtimeId,@Param("now") Instant now);

    @Query(value="""
        SELECT * FROM seat_hold
        WHERE state='HELD' AND expires_at>:now
        ORDER BY expires_at ASC
        """,nativeQuery=true)
    List<SeatHoldRecord> findAllActive(@Param("now") Instant now);

    List<SeatHoldRecord> findTop200ByStateAndExpiresAtBeforeOrderByExpiresAtAsc(String state, Instant expiresAt);
    List<SeatHoldRecord> findTop100ByOrderByCreatedAtDesc();

    long countByState(String state);
    long countByStateAndExpiresAtBetween(String state, Instant from, Instant to);
    long countByStateAndCreatedAtAfter(String state, Instant after);

    @Modifying
    @Query(value="""
        UPDATE seat_hold SET state='EXPIRED',released_at=:now,last_event='SEAT_HOLD_EXPIRED',version=version+1
        WHERE showtime_id=:showtimeId AND seat_id IN (:seatIds)
          AND state='HELD' AND expires_at<=:now
        """,nativeQuery=true)
    int expireRequested(@Param("showtimeId") UUID showtimeId,@Param("seatIds") List<UUID> seatIds,@Param("now") Instant now);

    @Modifying
    @Query(value="""
        UPDATE seat_hold SET state='EXPIRED',released_at=:now,last_event='SEAT_HOLD_EXPIRED'
        WHERE id=:id AND state='HELD' AND expires_at<=:now
        """,nativeQuery=true)
    int expireOne(@Param("id") UUID id,@Param("now") Instant now);

    @Modifying
    @Query(value="""
        UPDATE seat_hold SET state='EXPIRED',released_at=:now,last_event='SEAT_HOLD_EXPIRED',version=version+1
        WHERE state='HELD' AND expires_at<=:now
        """,nativeQuery=true)
    int expireAll(@Param("now") Instant now);
}
