package com.cinebooking.dr;

import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.cinebooking.dr.DisasterRecoveryDtos.*;

@RestController
@RequestMapping("/api/admin/disaster-recovery")
public class AdminDisasterRecoveryController {
    private final DisasterRecoveryService service;
    public AdminDisasterRecoveryController(DisasterRecoveryService service){this.service=service;}

    @GetMapping("/summary") public DisasterRecoverySummary summary(){return service.summary();}
    @GetMapping("/backups") public List<BackupEvidence> backups(@RequestParam(defaultValue="20") int limit){return service.backups(limit);}
    @GetMapping("/drills") public List<RestoreDrillEvidence> drills(@RequestParam(defaultValue="20") int limit){return service.drills(limit);}
}
