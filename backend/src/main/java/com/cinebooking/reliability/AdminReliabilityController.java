package com.cinebooking.reliability;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static com.cinebooking.reliability.ReliabilityDtos.*;

@RestController
@RequestMapping("/api/admin/reliability")
public class AdminReliabilityController {
    private final ReliabilityService service;

    public AdminReliabilityController(ReliabilityService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public ReliabilitySummary summary() { return service.summary(); }

    @GetMapping("/incidents")
    public List<ReliabilityIncident> incidents(@RequestParam(defaultValue = "50") int limit) { return service.incidents(limit); }

    @GetMapping("/runbook")
    public List<RunbookStep> runbook() { return service.runbook(); }
}
