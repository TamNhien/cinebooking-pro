package com.cinebooking.crm;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import static com.cinebooking.crm.CrmAutomationDtos.*;

@RestController
@RequestMapping("/api/admin/crm-automation")
public class AdminCrmAutomationController {
    private final CrmAutomationService service;

    public AdminCrmAutomationController(CrmAutomationService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    public CrmAutomationSummaryV77 summary(@RequestParam(defaultValue = "30") int days) {
        return service.summary(days);
    }

    @PostMapping("/preview")
    public CrmAutomationPreviewV77 preview(@RequestBody CrmAutomationRequestV77 request) {
        return service.preview(request);
    }

    @PostMapping("/execute")
    public CrmAutomationExecutionV77 execute(@RequestBody CrmAutomationRequestV77 request) {
        return service.execute(request);
    }
}
