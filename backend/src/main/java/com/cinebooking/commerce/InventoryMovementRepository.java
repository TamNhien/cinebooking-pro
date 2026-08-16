package com.cinebooking.commerce;

import com.cinebooking.domain.InventoryMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface InventoryMovementRepository extends JpaRepository<InventoryMovement,UUID> {
    boolean existsByBookingIdAndProductIdAndMovementType(UUID bookingId, UUID productId, String movementType);
    List<InventoryMovement> findTop200ByOrderByCreatedAtDesc();
    List<InventoryMovement> findTop200ByProductIdOrderByCreatedAtDesc(UUID productId);
}
