package com.cinebooking.commerce;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import static com.cinebooking.commerce.LoyaltyDtos.*;

@RestController @RequestMapping("/api/admin/loyalty")
public class AdminLoyaltyController {
    private final LoyaltyService loyalty;
    public AdminLoyaltyController(LoyaltyService loyalty){this.loyalty=loyalty;}
    @GetMapping("/members") public List<AdminMemberResponse> members(){return loyalty.adminMembers();}
    @PostMapping("/users/{userId}/adjustments") public LoyaltySummaryResponse adjust(@PathVariable UUID userId,@Valid @RequestBody AdminAdjustmentRequest req,Authentication a,HttpServletRequest http){return loyalty.adminAdjust(userId,req.deltaPoints(),req.reason(),a.getName(),clientIp(http));}
    @PutMapping("/users/{userId}/birth-date") public AdminMemberResponse birthDate(@PathVariable UUID userId,@Valid @RequestBody AdminBirthDateRequest req,Authentication a,HttpServletRequest http){return loyalty.adminBirthDate(userId,req.birthDate(),req.reason(),a.getName(),clientIp(http));}
    @PostMapping("/expire-now") public Map<String,Integer> expireNow(){return Map.of("expiredPoints",loyalty.expireSweep());}
    private String clientIp(HttpServletRequest r){String f=r.getHeader("X-Forwarded-For");return f==null||f.isBlank()?r.getRemoteAddr():f.split(",")[0].trim();}
}
