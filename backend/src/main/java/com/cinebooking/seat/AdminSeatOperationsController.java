package com.cinebooking.seat;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import static com.cinebooking.seat.SeatOperationsDtos.*;

@RestController
@RequestMapping("/api/admin/seat-operations")
public class AdminSeatOperationsController {
    private final AdminSeatOperationsService service;
    public AdminSeatOperationsController(AdminSeatOperationsService service){this.service=service;}

    @GetMapping("/summary") public SeatConsistencySummary summary(){return service.summary();}
    @GetMapping("/holds") public List<SeatHoldItem> holds(@RequestParam(defaultValue="80") int limit){return service.recent(limit);}
    @PostMapping("/reconcile") public ReconcileResponse reconcile(){return service.reconcile();}
}
