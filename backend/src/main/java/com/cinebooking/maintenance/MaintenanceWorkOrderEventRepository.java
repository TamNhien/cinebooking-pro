package com.cinebooking.maintenance;

import com.cinebooking.domain.MaintenanceWorkOrderEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface MaintenanceWorkOrderEventRepository extends JpaRepository<MaintenanceWorkOrderEvent,UUID> {
    List<MaintenanceWorkOrderEvent> findByWorkOrderIdOrderByCreatedAtAsc(UUID workOrderId);
}
