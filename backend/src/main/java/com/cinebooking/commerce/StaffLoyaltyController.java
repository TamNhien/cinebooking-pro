package com.cinebooking.commerce;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import static com.cinebooking.commerce.LoyaltyDtos.*;

@RestController @RequestMapping("/api/staff/loyalty-rewards")
public class StaffLoyaltyController {
    private final LoyaltyService loyalty;
    public StaffLoyaltyController(LoyaltyService loyalty){this.loyalty=loyalty;}
    public record ClaimRequest(String code){}
    @PostMapping("/claim") public ConcessionClaimResponse claim(@RequestBody ClaimRequest req,Authentication a){return loyalty.claimConcession(req.code(),a.getName());}
}
