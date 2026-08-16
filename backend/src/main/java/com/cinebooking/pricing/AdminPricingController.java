package com.cinebooking.pricing;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import static com.cinebooking.pricing.PricingDtos.*;

@RestController
@RequestMapping("/api/admin/pricing")
public class AdminPricingController {
    private final PricingService service;
    public AdminPricingController(PricingService service){this.service=service;}

    @GetMapping("/rules") public List<PricingRuleResponse> rules(){return service.allRules();}
    @PostMapping("/rules") public PricingRuleResponse create(@Valid @RequestBody PricingRuleRequest req){return service.saveRule(null,req);}
    @PutMapping("/rules/{id}") public PricingRuleResponse update(@PathVariable UUID id,@Valid @RequestBody PricingRuleRequest req){return service.saveRule(id,req);}
    @DeleteMapping("/rules/{id}") public void delete(@PathVariable UUID id){service.deleteRule(id);}
    @PostMapping("/preview") public PriceQuoteResponse preview(@Valid @RequestBody PricingPreviewRequest req){return service.preview(req.showtimeId(),req.seatId());}
}
