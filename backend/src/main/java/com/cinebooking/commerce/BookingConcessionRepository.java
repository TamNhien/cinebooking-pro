package com.cinebooking.commerce;
import com.cinebooking.domain.BookingConcession; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface BookingConcessionRepository extends JpaRepository<BookingConcession,UUID>{ List<BookingConcession> findByBookingId(UUID bookingId); void deleteByBookingId(UUID bookingId); }
