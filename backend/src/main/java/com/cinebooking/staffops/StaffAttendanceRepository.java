package com.cinebooking.staffops;
import com.cinebooking.domain.StaffAttendance;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.*;
public interface StaffAttendanceRepository extends JpaRepository<StaffAttendance,UUID>{
    Optional<StaffAttendance> findByShiftId(UUID shiftId);
    Optional<StaffAttendance> findFirstByStaffUserIdAndCheckOutAtIsNullOrderByCheckInAtDesc(UUID staffUserId);
    List<StaffAttendance> findTop50ByStaffUserIdOrderByCheckInAtDesc(UUID staffUserId);
    List<StaffAttendance> findByStaffUserIdAndCheckInAtBetweenOrderByCheckInAtAsc(UUID staffUserId,Instant from,Instant to);
}
