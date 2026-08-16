package com.cinebooking.booking;

import com.cinebooking.domain.BookingSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface BookingSeatRepository extends JpaRepository<BookingSeat, UUID> {
    List<BookingSeat> findByBookingId(UUID bookingId);
    boolean existsBySeatId(UUID seatId);

    /*
     * V16 consistency rule: the database unique index owns the truth.
     * Any unreleased booking_seat row blocks the seat, regardless of the booking status.
     * Stale/inactive rows are repaired before this query is used.
     */
    @Query(value = "SELECT bs.seat_id FROM booking_seat bs " +
            "WHERE bs.showtime_id=:showtimeId AND bs.released_at IS NULL", nativeQuery = true)
    List<UUID> findReservedSeatIds(@Param("showtimeId") UUID showtimeId);

    @Modifying
    @Query(value = "UPDATE booking_seat bs SET released_at=COALESCE(b.refunded_at,b.expires_at,CURRENT_TIMESTAMP) " +
            "FROM booking b WHERE b.id=bs.booking_id AND bs.showtime_id=:showtimeId " +
            "AND bs.released_at IS NULL AND b.status IN ('REFUNDED','CANCELLED','EXPIRED')", nativeQuery = true)
    int releaseInactiveRowsForShowtime(@Param("showtimeId") UUID showtimeId);

    @Modifying
    @Query(value = "UPDATE booking_seat SET released_at=CURRENT_TIMESTAMP " +
            "WHERE booking_id=:bookingId AND released_at IS NULL", nativeQuery = true)
    int releaseByBookingId(@Param("bookingId") UUID bookingId);

    // Kept for maintenance/backward compatibility. Normal booking lifecycle should use releaseByBookingId.
    @Modifying
    @Query("delete from BookingSeat bs where bs.bookingId = :bookingId")
    void deleteByBookingId(@Param("bookingId") UUID bookingId);
}
