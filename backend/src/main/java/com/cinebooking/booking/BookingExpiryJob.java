package com.cinebooking.booking;

import com.cinebooking.domain.BookingStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
public class BookingExpiryJob {
    private final BookingRepository bookings; private final BookingService service;
    public BookingExpiryJob(BookingRepository bookings, BookingService service){this.bookings=bookings;this.service=service;}
    @Scheduled(fixedDelay = 30000)
    public void expire() {
        for (var b : bookings.findByStatusAndExpiresAtBefore(BookingStatus.PENDING, Instant.now()))
            service.cancelPending(b.getId(), BookingStatus.EXPIRED);
    }
}
