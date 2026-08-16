package com.cinebooking.staffops;
import com.cinebooking.domain.StaffShift;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.*;
public interface StaffShiftRepository extends JpaRepository<StaffShift,UUID>{
    List<StaffShift> findByShiftDateBetweenOrderByShiftDateAscStartTimeAsc(LocalDate from,LocalDate to);
    List<StaffShift> findByCinemaIdAndShiftDateBetweenOrderByShiftDateAscStartTimeAsc(UUID cinemaId,LocalDate from,LocalDate to);
    List<StaffShift> findByStaffUserIdAndShiftDateBetweenOrderByShiftDateAscStartTimeAsc(UUID staffUserId,LocalDate from,LocalDate to);
    List<StaffShift> findByStaffUserIdAndStatusOrderByShiftDateAscStartTimeAsc(UUID staffUserId,String status);
}
