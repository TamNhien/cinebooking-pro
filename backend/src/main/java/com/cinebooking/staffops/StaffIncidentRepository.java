package com.cinebooking.staffops;
import com.cinebooking.domain.StaffIncident;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface StaffIncidentRepository extends JpaRepository<StaffIncident,UUID>{
    List<StaffIncident> findTop100ByCinemaIdOrderByCreatedAtDesc(UUID cinemaId);
    List<StaffIncident> findTop100ByOrderByCreatedAtDesc();
    long countByCinemaIdAndStatus(UUID cinemaId,String status);
    long countByStatus(String status);
    long countByStatusAndSeverity(String status,String severity);
}
