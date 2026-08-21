package com.cinebooking.booking;

import com.cinebooking.domain.BookingStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.Instant;

@Component
public class ShowtimeReminderJob {
    private final BookingRepository bookings; private final BookingService service; private final int reminderHours;
    public ShowtimeReminderJob(BookingRepository b,BookingService s,@Value("${app.notifications.showtime-reminder-hours:3}") int reminderHours){bookings=b;service=s;this.reminderHours=Math.max(1,reminderHours);}
    @Scheduled(fixedDelayString = "${app.notifications.showtime-reminder-scan-ms:60000}")
    public void remind(){Instant now=Instant.now();Instant until=now.plusSeconds(reminderHours*3600L+60);for(var b:bookings.findUpcomingForReminder(BookingStatus.CONFIRMED.name(),now,until))service.sendEngagementRemindersIfDue(b.getId());}
}
