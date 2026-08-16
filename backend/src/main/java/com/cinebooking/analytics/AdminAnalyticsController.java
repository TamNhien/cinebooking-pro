package com.cinebooking.analytics;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

import static com.cinebooking.analytics.AnalyticsDtos.Dashboard;

@RestController
@RequestMapping("/api/admin/analytics")
public class AdminAnalyticsController {
    private final AdminAnalyticsService service;

    public AdminAnalyticsController(AdminAnalyticsService service) {
        this.service = service;
    }

    @GetMapping
    public Dashboard dashboard(
            @RequestParam(defaultValue = "30") int days,
            @RequestParam(required = false) UUID cinemaId
    ) {
        return service.dashboard(days, cinemaId);
    }
}
