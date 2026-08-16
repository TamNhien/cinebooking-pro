package com.cinebooking.booking;

import com.cinebooking.domain.BookingStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ShowtimeReminderJob {
    private final BookingRepository bookings; private final BookingService service;
    public ShowtimeReminderJob(BookingRepository b,BookingService s){bookings=b;service=s;}
    @Scheduled(fixedDelay = 300000)
    public void remind(){for(var b:bookings.findByStatusAndReminderSentFalse(BookingStatus.CONFIRMED)) service.sendReminderIfDue(b.getId());}
}
