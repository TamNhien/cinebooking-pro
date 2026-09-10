package com.cinebooking.analyticsbi;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import static com.cinebooking.analyticsbi.AnalyticsBiDtos.AnalyticsBiSummary;

@RestController
@RequestMapping("/api/admin/analytics-bi")
public class AdminAnalyticsBiController {
    private final AnalyticsBiService service;

    public AdminAnalyticsBiController(AnalyticsBiService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public AnalyticsBiSummary summary(@RequestParam(defaultValue = "90") int days) {
        return service.summary(days);
    }
}
