package com.cinebooking.security;

import com.cinebooking.common.ApiException;
import com.cinebooking.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import static com.cinebooking.security.SecurityProtectionDtos.*;

@RestController
@RequestMapping("/api/me/security")
public class SecurityProtectionController {
    private final SecurityProtectionService security; private final UserRepository users;
    public SecurityProtectionController(SecurityProtectionService security,UserRepository users){this.security=security;this.users=users;}
    @GetMapping("/overview") public SecurityOverview overview(Authentication auth){return security.overview(user(auth));}
    @GetMapping("/trusted-devices") public List<TrustedDeviceView> devices(Authentication auth){return security.trustedDevices(user(auth));}
    @PostMapping("/trusted-devices/current") public TrustedDeviceView trust(@Valid @RequestBody TrustCurrentDeviceRequest req,Authentication auth){return security.trustCurrent(user(auth),current(auth),req.label());}
    @DeleteMapping("/trusted-devices/{id}") public Map<String,Object> revoke(@PathVariable UUID id,Authentication auth){security.revokeTrustedDevice(user(auth),id);return Map.of("revoked",true);}
    @GetMapping("/alerts") public List<SecurityAlertView> alerts(Authentication auth){return security.alerts(user(auth));}
    @PatchMapping("/alerts/{id}/acknowledge") public SecurityAlertView acknowledge(@PathVariable UUID id,Authentication auth){return security.acknowledge(user(auth),id);}
    private UUID user(Authentication auth){return users.findByEmailIgnoreCase(auth.getName()).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản")).getId();}
    private UUID current(Authentication auth){return auth.getDetails() instanceof UUID u?u:null;}
}
