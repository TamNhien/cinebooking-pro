package com.cinebooking.commerce;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.cinebooking.commerce.InventoryDtos.*;

@RestController
@RequestMapping("/api/admin/inventory")
public class AdminInventoryController {
    private final InventoryService inventory;
    public AdminInventoryController(InventoryService inventory){this.inventory=inventory;}

    @GetMapping public InventorySummary summary(){return inventory.summary();}
    @GetMapping("/movements") public List<InventoryMovementResponse> movements(@RequestParam(required=false) UUID productId){return inventory.history(productId);}
    @PostMapping("/adjustments") public InventoryProductResponse adjust(@Valid @RequestBody InventoryAdjustmentRequest req, Authentication auth){return inventory.adjust(req,auth.getName());}
}
