package com.cinebooking.staffops;

import java.time.*;

/** Pure business rules for shift windows. Kept dependency-free so it is easy to unit-test. */
public final class StaffShiftRules {
    private StaffShiftRules() {}

    public static ZonedDateTime start(LocalDate date, LocalTime start, ZoneId zone) {
        return ZonedDateTime.of(date, start, zone);
    }

    public static ZonedDateTime end(LocalDate date, LocalTime start, LocalTime end, ZoneId zone) {
        LocalDate endDate = end.isAfter(start) ? date : date.plusDays(1);
        return ZonedDateTime.of(endDate, end, zone);
    }

    public static boolean overlaps(LocalDate aDate, LocalTime aStart, LocalTime aEnd,
                                   LocalDate bDate, LocalTime bStart, LocalTime bEnd,
                                   ZoneId zone) {
        ZonedDateTime as = start(aDate, aStart, zone);
        ZonedDateTime ae = end(aDate, aStart, aEnd, zone);
        ZonedDateTime bs = start(bDate, bStart, zone);
        ZonedDateTime be = end(bDate, bStart, bEnd, zone);
        return as.isBefore(be) && bs.isBefore(ae);
    }

    /**
     * V11.1 attendance rule: a staff member may start the assigned shift from
     * earlyMinutes before the scheduled start until the scheduled shift end.
     *
     * This intentionally replaces the old "start + 60 minutes" cutoff. A late
     * employee can still clock in while the assigned shift is actually running;
     * the late arrival remains visible in attendance/audit history.
     */
    public static boolean canStartShift(ZonedDateTime now, LocalDate date, LocalTime start, LocalTime end,
                                        ZoneId zone, long earlyMinutes) {
        ZonedDateTime s = start(date, start, zone);
        ZonedDateTime e = end(date, start, end, zone);
        return !now.isBefore(s.minusMinutes(earlyMinutes)) && now.isBefore(e);
    }

    /** Backward-compatible overload retained for old callers/tests. lateMinutes is ignored in V11.1. */
    public static boolean canStartShift(ZonedDateTime now, LocalDate date, LocalTime start, LocalTime end,
                                        ZoneId zone, long earlyMinutes, long lateMinutes) {
        return canStartShift(now, date, start, end, zone, earlyMinutes);
    }

    public static boolean scanWindowStillOpen(ZonedDateTime now, LocalDate date, LocalTime start, LocalTime end,
                                              ZoneId zone, long graceMinutes) {
        return !now.isAfter(end(date, start, end, zone).plusMinutes(graceMinutes));
    }
}
