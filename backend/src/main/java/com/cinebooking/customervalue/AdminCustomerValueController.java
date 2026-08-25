package com.cinebooking.customervalue;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

import static com.cinebooking.customervalue.CustomerValueDtos.*;

@RestController
@RequestMapping("/api/admin/customer-value")
public class AdminCustomerValueController {
    private final CustomerValueIntelligenceService service;

    public AdminCustomerValueController(CustomerValueIntelligenceService service) {
        this.service = service;
    }

    @GetMapping("/cinemas")
    public List<CinemaOption> cinemas(Authentication authentication) {
        return service.cinemaOptions(authentication.getName());
    }

    @GetMapping("/scorecard")
    public CustomerValueScorecard scorecard(
            @RequestParam(required = false) UUID cinemaId,
            @RequestParam(defaultValue = "90") int periodDays,
            Authentication authentication
    ) {
        return service.scorecard(authentication.getName(), cinemaId, periodDays);
    }
}
