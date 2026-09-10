package com.cinebooking.recommendation;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import static com.cinebooking.recommendation.AdminRecommendationDtos.RecommendationAdminSummaryV76;

@RestController
@RequestMapping("/api/admin/recommendation")
public class AdminRecommendationController {
    private final AdminRecommendationService service;

    public AdminRecommendationController(AdminRecommendationService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public RecommendationAdminSummaryV76 summary(@RequestParam(defaultValue = "30") int days) {
        return service.summary(days);
    }
}
