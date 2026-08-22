package com.cinebooking.staffops;
import com.cinebooking.domain.StaffShiftHandover;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface StaffShiftHandoverRepository extends JpaRepository<StaffShiftHandover,UUID>{
    List<StaffShiftHandover> findTop50ByCinemaIdOrderByCreatedAtDesc(UUID cinemaId);
    boolean existsByFromAttendanceIdAndStatus(UUID attendanceId,String status);
}
