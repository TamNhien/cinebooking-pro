package com.cinebooking.risk;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

import static com.cinebooking.risk.FraudRiskDtos.*;

@RestController
@RequestMapping("/api/admin/risk")
public class AdminFraudRiskController {
    private final FraudRiskService service;

    public AdminFraudRiskController(FraudRiskService service) { this.service = service; }

    @GetMapping("/scorecard")
    public RiskScorecard scorecard() { return service.scorecard(); }

    @PostMapping("/users/{userId}/disposition")
    public DispositionResult disposition(@PathVariable UUID userId,
                                         @RequestBody DispositionRequest request,
                                         Authentication authentication,
                                         HttpServletRequest servletRequest) {
        return service.setDisposition(userId, authentication.getName(), request, clientIp(servletRequest));
    }

    private static String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) return forwarded.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}
