package com.cinebooking.marketing;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static com.cinebooking.marketing.MarketingAutomationDtos.*;

@RestController
@RequestMapping("/api/admin/marketing")
public class AdminMarketingAutomationController {
    private final MarketingAutomationService service;

    public AdminMarketingAutomationController(MarketingAutomationService service) {
        this.service = service;
    }

    @GetMapping("/segments")
    public MarketingOverview segments() {
        return service.overview();
    }

    @PostMapping("/campaigns/preview")
    public CampaignPreview preview(@RequestBody CampaignRequest request) {
        return service.preview(request);
    }

    @PostMapping("/campaigns/launch")
    public CampaignLaunchResult launch(@RequestBody CampaignRequest request) {
        return service.launch(request);
    }
}
