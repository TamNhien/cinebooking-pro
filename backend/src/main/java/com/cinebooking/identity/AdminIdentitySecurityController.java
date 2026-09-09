package com.cinebooking.identity;

import org.springframework.web.bind.annotation.*;
import static com.cinebooking.identity.StepUpDtos.*;

@RestController
@RequestMapping("/api/admin/identity-security")
public class AdminIdentitySecurityController {
    private final StepUpAuthenticationService service;
    public AdminIdentitySecurityController(StepUpAuthenticationService service){this.service=service;}
    @GetMapping("/summary") public AdminIdentitySecuritySummary summary(){return service.adminSummary();}
}
