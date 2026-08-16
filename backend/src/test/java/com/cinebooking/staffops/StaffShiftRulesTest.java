package com.cinebooking.staffops;

import org.junit.jupiter.api.Test;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;

class StaffShiftRulesTest {
    private final ZoneId zone=ZoneId.of("Asia/Ho_Chi_Minh");

    @Test void detectsOverlapAndAllowsAdjacent(){
        assertTrue(StaffShiftRules.overlaps(LocalDate.of(2026,8,12),LocalTime.of(8,0),LocalTime.of(14,0),LocalDate.of(2026,8,12),LocalTime.of(13,0),LocalTime.of(20,0),zone));
        assertFalse(StaffShiftRules.overlaps(LocalDate.of(2026,8,12),LocalTime.of(8,0),LocalTime.of(14,0),LocalDate.of(2026,8,12),LocalTime.of(14,0),LocalTime.of(20,0),zone));
    }

    @Test void handlesCrossMidnightShift(){
        assertTrue(StaffShiftRules.overlaps(LocalDate.of(2026,8,12),LocalTime.of(20,0),LocalTime.of(2,0),LocalDate.of(2026,8,13),LocalTime.of(1,0),LocalTime.of(6,0),zone));
        assertEquals(LocalDate.of(2026,8,13),StaffShiftRules.end(LocalDate.of(2026,8,12),LocalTime.of(20,0),LocalTime.of(2,0),zone).toLocalDate());
    }

    @Test void attendanceCanStartAnyTimeWhileShiftIsRunning(){
        LocalDate d=LocalDate.of(2026,8,12); LocalTime start=LocalTime.of(8,0); LocalTime end=LocalTime.of(14,0);
        assertTrue(StaffShiftRules.canStartShift(ZonedDateTime.of(2026,8,12,7,45,0,0,zone),d,start,end,zone,30));
        assertTrue(StaffShiftRules.canStartShift(ZonedDateTime.of(2026,8,12,8,45,0,0,zone),d,start,end,zone,30));
        assertTrue(StaffShiftRules.canStartShift(ZonedDateTime.of(2026,8,12,12,30,0,0,zone),d,start,end,zone,30));
        assertTrue(StaffShiftRules.canStartShift(ZonedDateTime.of(2026,8,12,13,59,59,0,zone),d,start,end,zone,30));
        assertFalse(StaffShiftRules.canStartShift(ZonedDateTime.of(2026,8,12,7,29,59,0,zone),d,start,end,zone,30));
        assertFalse(StaffShiftRules.canStartShift(ZonedDateTime.of(2026,8,12,14,0,0,0,zone),d,start,end,zone,30));
    }

    @Test void attendanceWorksForNightShiftToMidnight(){
        LocalDate d=LocalDate.of(2026,8,12); LocalTime start=LocalTime.of(20,0); LocalTime end=LocalTime.MIDNIGHT;
        assertTrue(StaffShiftRules.canStartShift(ZonedDateTime.of(2026,8,12,20,32,0,0,zone),d,start,end,zone,30));
        assertTrue(StaffShiftRules.canStartShift(ZonedDateTime.of(2026,8,12,23,59,0,0,zone),d,start,end,zone,30));
        assertFalse(StaffShiftRules.canStartShift(ZonedDateTime.of(2026,8,13,0,0,0,0,zone),d,start,end,zone,30));
    }

    @Test void scanGraceWindowIsEnforced(){
        assertTrue(StaffShiftRules.scanWindowStillOpen(ZonedDateTime.of(2026,8,12,14,20,0,0,zone),LocalDate.of(2026,8,12),LocalTime.of(8,0),LocalTime.of(14,0),zone,30));
        assertFalse(StaffShiftRules.scanWindowStillOpen(ZonedDateTime.of(2026,8,12,14,31,0,0,zone),LocalDate.of(2026,8,12),LocalTime.of(8,0),LocalTime.of(14,0),zone,30));
    }
}
