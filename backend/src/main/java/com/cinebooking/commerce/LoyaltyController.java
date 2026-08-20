package com.cinebooking.commerce;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import static com.cinebooking.commerce.LoyaltyDtos.*;

@RestController @RequestMapping("/api/loyalty")
public class LoyaltyController {
    private final LoyaltyService loyalty;
    public LoyaltyController(LoyaltyService loyalty){this.loyalty=loyalty;}
    @GetMapping("/summary") public LoyaltySummaryResponse summary(Authentication a){return loyalty.summary(a.getName());}
    @GetMapping("/transactions") public List<LoyaltyTransactionResponse> transactions(Authentication a){return loyalty.history(a.getName());}
    @GetMapping("/rewards") public List<LoyaltyRewardResponse> rewards(Authentication a){return loyalty.rewardCatalog(a.getName());}
    @GetMapping("/redemptions") public List<LoyaltyRedemptionResponse> redemptions(Authentication a){return loyalty.redemptions(a.getName());}
    @GetMapping("/vouchers") public List<OwnedVoucherResponse> vouchers(Authentication a){return loyalty.ownedVouchers(a.getName());}
    @PostMapping("/rewards/{id}/redeem") public LoyaltyRedemptionResponse redeem(@PathVariable UUID id,Authentication a){return loyalty.redeemReward(a.getName(),id);}
    @PostMapping("/birthday-reward") public BirthdayRewardResponse birthday(Authentication a){return loyalty.claimBirthdayReward(a.getName());}
}
