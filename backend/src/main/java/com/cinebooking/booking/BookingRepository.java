package com.cinebooking.booking;

import com.cinebooking.domain.Booking;
import com.cinebooking.domain.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {
    List<Booking> findByUserIdOrderByCreatedAtDesc(UUID userId);
    List<Booking> findByStatusAndExpiresAtBefore(BookingStatus status, Instant time);
    List<Booking> findByShowtimeIdAndStatusAndExpiresAtBefore(UUID showtimeId, BookingStatus status, Instant time);
    Optional<Booking> findFirstByUserIdAndShowtimeIdAndStatusOrderByCreatedAtDesc(UUID userId, UUID showtimeId, BookingStatus status);
    Optional<Booking> findByUserIdAndIdempotencyKey(UUID userId, String idempotencyKey);
    boolean existsByShowtimeId(UUID showtimeId);
    long countByShowtimeIdAndCreatedAtAfter(UUID showtimeId, Instant createdAt);
    List<Booking> findByStatusAndReminderSentFalse(BookingStatus status);
    List<Booking> findByStatusOrderByRefundRequestedAtAsc(BookingStatus status);

    @Query(value="""
        select b.* from booking b
        join showtime s on s.id=b.showtime_id
        where b.status=:status and b.checked_in_at is null
          and s.start_time>:now and s.start_time<=:until
        order by s.start_time asc
        """,nativeQuery=true)
    List<Booking> findUpcomingForReminder(@Param("status") String status,@Param("now") Instant now,@Param("until") Instant until);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") UUID id);
}
