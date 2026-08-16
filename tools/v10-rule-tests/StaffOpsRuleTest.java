import com.cinebooking.staffops.StaffShiftRules;
import java.time.*;

public class StaffOpsRuleTest {
    private static int passed=0;
    public static void main(String[] args){
        ZoneId z=ZoneId.of("Asia/Ho_Chi_Minh");
        assertTrue(StaffShiftRules.overlaps(LocalDate.of(2026,8,12),LocalTime.of(8,0),LocalTime.of(14,0),LocalDate.of(2026,8,12),LocalTime.of(13,0),LocalTime.of(20,0),z),"detect overlap");
        assertFalse(StaffShiftRules.overlaps(LocalDate.of(2026,8,12),LocalTime.of(8,0),LocalTime.of(14,0),LocalDate.of(2026,8,12),LocalTime.of(14,0),LocalTime.of(20,0),z),"adjacent shifts allowed");
        assertTrue(StaffShiftRules.overlaps(LocalDate.of(2026,8,12),LocalTime.of(20,0),LocalTime.of(2,0),LocalDate.of(2026,8,13),LocalTime.of(1,0),LocalTime.of(6,0),z),"cross-midnight overlap");
        assertTrue(StaffShiftRules.canStartShift(ZonedDateTime.of(2026,8,12,7,45,0,0,z),LocalDate.of(2026,8,12),LocalTime.of(8,0),LocalTime.of(14,0),z,30,60),"start 15 min early");
        assertTrue(StaffShiftRules.canStartShift(ZonedDateTime.of(2026,8,12,8,45,0,0,z),LocalDate.of(2026,8,12),LocalTime.of(8,0),LocalTime.of(14,0),z,30,60),"start 45 min late");
        assertFalse(StaffShiftRules.canStartShift(ZonedDateTime.of(2026,8,12,6,0,0,0,z),LocalDate.of(2026,8,12),LocalTime.of(8,0),LocalTime.of(14,0),z,30,60),"too early denied");
        assertFalse(StaffShiftRules.canStartShift(ZonedDateTime.of(2026,8,12,9,30,0,0,z),LocalDate.of(2026,8,12),LocalTime.of(8,0),LocalTime.of(14,0),z,30,60),"too late denied");
        assertTrue(StaffShiftRules.scanWindowStillOpen(ZonedDateTime.of(2026,8,12,14,20,0,0,z),LocalDate.of(2026,8,12),LocalTime.of(8,0),LocalTime.of(14,0),z,30),"scan grace allowed");
        assertFalse(StaffShiftRules.scanWindowStillOpen(ZonedDateTime.of(2026,8,12,14,31,0,0,z),LocalDate.of(2026,8,12),LocalTime.of(8,0),LocalTime.of(14,0),z,30),"scan after grace denied");
        System.out.println("PASS: "+passed+" staff shift rule tests");
    }
    static void assertTrue(boolean v,String name){if(!v)throw new AssertionError(name);passed++;}
    static void assertFalse(boolean v,String name){assertTrue(!v,name);}
}
