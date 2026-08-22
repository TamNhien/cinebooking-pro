package com.cinebooking.maintenance;

import com.cinebooking.domain.MaintenanceWorkOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.*;

public interface MaintenanceWorkOrderRepository extends JpaRepository<MaintenanceWorkOrder,UUID> {
    List<MaintenanceWorkOrder> findTop200ByCinemaIdOrderByCreatedAtDesc(UUID cinemaId);
    long countByCinemaIdAndStatusIn(UUID cinemaId,Collection<String> statuses);
    long countByCinemaIdAndPriorityAndStatusIn(UUID cinemaId,String priority,Collection<String> statuses);
    long countByCinemaIdAndDueAtBeforeAndStatusIn(UUID cinemaId,Instant before,Collection<String> statuses);
}
