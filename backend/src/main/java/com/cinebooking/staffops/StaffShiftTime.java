package com.cinebooking.staffops;
import com.cinebooking.domain.StaffShift;
import java.time.*;
public final class StaffShiftTime {
    private StaffShiftTime(){}
    public static ZonedDateTime start(StaffShift s, ZoneId zone){return StaffShiftRules.start(s.getShiftDate(),s.getStartTime(),zone);}
    public static ZonedDateTime end(StaffShift s, ZoneId zone){return StaffShiftRules.end(s.getShiftDate(),s.getStartTime(),s.getEndTime(),zone);}
    public static boolean overlaps(StaffShift a, StaffShift b, ZoneId zone){return StaffShiftRules.overlaps(a.getShiftDate(),a.getStartTime(),a.getEndTime(),b.getShiftDate(),b.getStartTime(),b.getEndTime(),zone);}
}
