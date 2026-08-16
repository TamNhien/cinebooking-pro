package com.cinebooking.notification;

import com.cinebooking.domain.Cinema;
import com.cinebooking.domain.StaffShift;
import com.cinebooking.movie.CinemaRepository;
import com.cinebooking.staffops.StaffShiftRepository;
import com.cinebooking.staffops.StaffShiftTime;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.*;

@Component
public class StaffShiftReminderJob {
    private final StaffShiftRepository shifts;
    private final CinemaRepository cinemas;
    private final NotificationService notifications;
    private final ZoneId zone;
    private final int reminderMinutes;

    public StaffShiftReminderJob(StaffShiftRepository shifts,CinemaRepository cinemas,NotificationService notifications,
                                 @Value("${app.staff.time-zone:Asia/Ho_Chi_Minh}") String zone,
                                 @Value("${app.notifications.staff-shift-reminder-minutes:30}") int reminderMinutes){
        this.shifts=shifts;this.cinemas=cinemas;this.notifications=notifications;this.zone=ZoneId.of(zone);this.reminderMinutes=Math.max(5,reminderMinutes);
    }

    @Scheduled(fixedDelayString = "${app.notifications.staff-shift-scan-ms:60000}")
    public void remind(){
        ZonedDateTime now=ZonedDateTime.now(zone);
        LocalDate from=now.toLocalDate().minusDays(1),to=now.toLocalDate().plusDays(1);
        for(StaffShift s:shifts.findByShiftDateBetweenOrderByShiftDateAscStartTimeAsc(from,to)){
            if(!"SCHEDULED".equals(s.getStatus()))continue;
            ZonedDateTime start=StaffShiftTime.start(s,zone);
            ZonedDateTime remindAt=start.minusMinutes(reminderMinutes);
            if(now.isBefore(remindAt)||!now.isBefore(start))continue;
            String cinema=cinemas.findById(s.getCinemaId()).map(Cinema::getName).orElse("rạp được phân công");
            String message="Ca làm tại "+cinema+" bắt đầu lúc "+s.getStartTime()+" ngày "+s.getShiftDate()+". Hãy chuẩn bị chấm công đúng giờ.";
            notifications.createOnce(s.getStaffUserId(),"STAFF_SHIFT_REMINDER","Sắp đến ca làm",message,"/staff/schedule","SHIFT_REMINDER:"+s.getId());
        }
    }
}
