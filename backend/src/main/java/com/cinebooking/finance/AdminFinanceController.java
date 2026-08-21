package com.cinebooking.finance;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.UUID;
import static com.cinebooking.finance.FinanceDtos.*;

@RestController
@RequestMapping("/api/admin/finance")
public class AdminFinanceController {
    private final FinancialLedgerService service;
    public AdminFinanceController(FinancialLedgerService service){this.service=service;}
    @GetMapping public FinanceDashboard dashboard(@RequestParam(required=false) LocalDate date){return service.dashboard(date);}
    @PostMapping("/reconcile") public ReconciliationRunView reconcile(@RequestParam(required=false) LocalDate date,Authentication auth,HttpServletRequest request){return service.reconcile(date,auth.getName(),ip(request));}
    @PostMapping("/issues/{id}/resolve") public ReconciliationIssueView resolve(@PathVariable UUID id,Authentication auth,HttpServletRequest request){return service.resolveIssue(id,auth.getName(),ip(request));}
    private String ip(HttpServletRequest r){String x=r.getHeader("X-Forwarded-For");return x==null||x.isBlank()?r.getRemoteAddr():x.split(",")[0].trim();}
}
