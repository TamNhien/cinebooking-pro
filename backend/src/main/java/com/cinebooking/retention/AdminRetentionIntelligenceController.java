package com.cinebooking.retention;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

import static com.cinebooking.retention.RetentionIntelligenceDtos.*;

@RestController
@RequestMapping("/api/admin/retention")
public class AdminRetentionIntelligenceController {
    private final RetentionIntelligenceService service;

    public AdminRetentionIntelligenceController(RetentionIntelligenceService service) {
        this.service = service;
    }

    @GetMapping("/cinemas")
    public List<CinemaOption> cinemas(Authentication authentication) {
        return service.cinemaOptions(authentication.getName());
    }

    @GetMapping("/scorecard")
    public RetentionScorecard scorecard(
            @RequestParam(required = false) UUID cinemaId,
            @RequestParam(defaultValue = "30") int periodDays,
            Authentication authentication
    ) {
        return service.scorecard(authentication.getName(), cinemaId, periodDays);
    }
}
