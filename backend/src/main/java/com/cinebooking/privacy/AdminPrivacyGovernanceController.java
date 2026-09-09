package com.cinebooking.privacy;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.cinebooking.privacy.PrivacyGovernanceDtos.*;

@RestController
@RequestMapping("/api/admin/privacy-governance")
public class AdminPrivacyGovernanceController {
    private final PrivacyGovernanceService service;
    public AdminPrivacyGovernanceController(PrivacyGovernanceService service){this.service=service;}

    @GetMapping("/summary") public PrivacyGovernanceSummary summary(){return service.summary();}
    @GetMapping("/policies") public List<RetentionPolicy> policies(){return service.policies();}
    @GetMapping("/requests") public List<PrivacyRequest> requests(@RequestParam(defaultValue="50") int limit){return service.requests(limit);}
    @GetMapping("/subject-inventory") public SubjectInventory subjectInventory(@RequestParam String email){return service.subjectInventory(email);}
    @PostMapping("/requests") public PrivacyRequest create(@RequestBody CreatePrivacyRequest body,Authentication auth,HttpServletRequest request){return service.create(body,auth.getName(),ip(request));}
    @PostMapping("/requests/{id}/review") public PrivacyRequest review(@PathVariable UUID id,@RequestBody ReviewPrivacyRequest body,Authentication auth,HttpServletRequest request){return service.review(id,body,auth.getName(),ip(request));}

    private String ip(HttpServletRequest r){String x=r.getHeader("X-Forwarded-For");return x==null||x.isBlank()?r.getRemoteAddr():x.split(",")[0].trim();}
}
