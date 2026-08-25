package com.cinebooking.performance;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

import static com.cinebooking.performance.PerformanceBenchmarkDtos.*;

@RestController
@RequestMapping("/api/admin/performance")
public class AdminPerformanceBenchmarkController {
    private final PerformanceBenchmarkService service;

    public AdminPerformanceBenchmarkController(PerformanceBenchmarkService service) {
        this.service = service;
    }

    @GetMapping("/cinemas")
    public List<CinemaOption> cinemas(Authentication authentication) {
        return service.cinemaOptions(authentication.getName());
    }

    @GetMapping("/scorecard")
    public Scorecard scorecard(
            @RequestParam(required = false) UUID cinemaId,
            @RequestParam(defaultValue = "7") int periodDays,
            Authentication authentication
    ) {
        return service.scorecard(authentication.getName(), cinemaId, periodDays);
    }
}
