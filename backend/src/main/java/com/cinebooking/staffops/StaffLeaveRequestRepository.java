package com.cinebooking.staffops;

import com.cinebooking.domain.StaffLeaveRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.*;

public interface StaffLeaveRequestRepository extends JpaRepository<StaffLeaveRequest,UUID> {
    List<StaffLeaveRequest> findByStaffUserIdOrderByCreatedAtDesc(UUID staffUserId);
    List<StaffLeaveRequest> findByStatusOrderByCreatedAtAsc(String status);
    List<StaffLeaveRequest> findByCinemaIdAndStatusOrderByCreatedAtAsc(UUID cinemaId,String status);
    List<StaffLeaveRequest> findByCinemaIdAndFromDateLessThanEqualAndToDateGreaterThanEqualOrderByFromDateAsc(UUID cinemaId,LocalDate to,LocalDate from);

    @Query("select case when count(r)>0 then true else false end from StaffLeaveRequest r where r.staffUserId=:staff and r.status in :statuses and r.fromDate<=:to and r.toDate>=:from")
    boolean existsOverlap(@Param("staff") UUID staff,@Param("from") LocalDate from,@Param("to") LocalDate to,@Param("statuses") Collection<String> statuses);

    @Query("select r from StaffLeaveRequest r where r.staffUserId=:staff and r.status='APPROVED' and r.fromDate<=:to and r.toDate>=:from order by r.fromDate")
    List<StaffLeaveRequest> approvedOverlap(@Param("staff") UUID staff,@Param("from") LocalDate from,@Param("to") LocalDate to);
}
