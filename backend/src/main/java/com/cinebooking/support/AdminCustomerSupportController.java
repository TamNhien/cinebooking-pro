package com.cinebooking.support;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import static com.cinebooking.support.SupportDtos.*;

@RestController
@RequestMapping("/api/admin/support")
public class AdminCustomerSupportController {
    private final CustomerSupportService service;
    public AdminCustomerSupportController(CustomerSupportService service){this.service=service;}
    @GetMapping("/cinemas") public List<SupportCinema> cinemas(Authentication auth){return service.cinemaOptions(auth.getName());}
    @GetMapping("/staff-options") public List<SupportStaff> staff(@RequestParam(required=false) UUID cinemaId,Authentication auth){return service.staffOptions(auth.getName(),cinemaId);}
    @GetMapping("/summary") public SupportSummary summary(@RequestParam(required=false) UUID cinemaId,Authentication auth){return service.summary(auth.getName(),cinemaId);}
    @GetMapping("/cases") public List<CaseResponse> cases(@RequestParam(required=false) UUID cinemaId,Authentication auth){return service.adminCases(auth.getName(),cinemaId);}
    @GetMapping("/cases/{id}/events") public List<CaseEventResponse> events(@PathVariable UUID id,Authentication auth){return service.adminEvents(id,auth.getName());}
    @PutMapping("/cases/{id}/plan") public CaseResponse plan(@PathVariable UUID id,@Valid @RequestBody CasePlanRequest body,Authentication auth,HttpServletRequest req){return service.plan(id,body,auth.getName(),ip(req));}
    @PostMapping("/cases/{id}/reply") public CaseResponse reply(@PathVariable UUID id,@Valid @RequestBody StaffReplyRequest body,Authentication auth,HttpServletRequest req){return service.staffReply(id,body,auth.getName(),ip(req));}
    @PostMapping("/cases/{id}/transition") public CaseResponse transition(@PathVariable UUID id,@Valid @RequestBody CaseTransitionRequest body,Authentication auth,HttpServletRequest req){return service.transition(id,body,auth.getName(),ip(req));}
    private String ip(HttpServletRequest r){String x=r.getHeader("X-Forwarded-For");return x==null||x.isBlank()?r.getRemoteAddr():x.split(",")[0].trim();}
}
