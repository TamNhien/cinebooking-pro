package com.cinebooking.observability;

import com.cinebooking.observability.ObservabilityDtos.ObservabilitySummary;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/observability")
public class AdminObservabilityController {
    private final ObservabilityService service;

    public AdminObservabilityController(ObservabilityService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public ObservabilitySummary summary() {
        return service.summary();
    }
}
