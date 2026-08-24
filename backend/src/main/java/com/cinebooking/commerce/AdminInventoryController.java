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

    @GetMapping("/branches") public List<InventoryBranchOverview> branches(){return inventory.branches();}
    @GetMapping public InventorySummary summary(@RequestParam UUID cinemaId){return inventory.summary(cinemaId);}
    @GetMapping("/movements") public List<InventoryMovementResponse> movements(@RequestParam(required=false) UUID cinemaId,@RequestParam(required=false) UUID productId){return inventory.history(cinemaId,productId);}
    @PostMapping("/adjustments") public InventoryProductResponse adjust(@Valid @RequestBody InventoryAdjustmentRequest req,Authentication auth){return inventory.adjust(req,auth.getName());}
    @PostMapping("/transfers") public InventoryTransferResponse transfer(@Valid @RequestBody InventoryTransferRequest req,Authentication auth){return inventory.transfer(req,auth.getName());}
    @PutMapping("/prices") public BranchPriceResponse price(@Valid @RequestBody BranchPriceRequest req){return inventory.setPrice(req);}
}
