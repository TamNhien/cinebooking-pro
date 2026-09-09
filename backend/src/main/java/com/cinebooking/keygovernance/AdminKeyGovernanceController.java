package com.cinebooking.keygovernance;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.cinebooking.keygovernance.KeyGovernanceDtos.*;

@RestController
@RequestMapping("/api/admin/key-governance")
public class AdminKeyGovernanceController {
    private final KeyGovernanceService service;
    public AdminKeyGovernanceController(KeyGovernanceService service){this.service=service;}

    @GetMapping("/summary") public KeyGovernanceSummary summary(){return service.summary();}
    @GetMapping("/policies") public List<SecretRotationPolicy> policies(){return service.policies();}
    @GetMapping("/events") public List<SecretRotationEvent> events(@RequestParam(defaultValue="50") int limit){return service.events(limit);}
    @PostMapping("/events") public SecretRotationEvent record(@RequestBody RecordSecretRotationEventRequest body, Authentication auth, HttpServletRequest request){return service.record(body,auth.getName(),ip(request));}

    private String ip(HttpServletRequest r){String x=r.getHeader("X-Forwarded-For");return x==null||x.isBlank()?r.getRemoteAddr():x.split(",")[0].trim();}
}
