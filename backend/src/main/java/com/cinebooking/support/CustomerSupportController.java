package com.cinebooking.support;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import static com.cinebooking.support.SupportDtos.*;

@RestController
@RequestMapping("/api/support")
public class CustomerSupportController {
    private final CustomerSupportService service;
    public CustomerSupportController(CustomerSupportService service){this.service=service;}
    @GetMapping("/cases") public List<CaseResponse> cases(Authentication auth){return service.myCases(auth.getName());}
    @PostMapping("/cases") @ResponseStatus(HttpStatus.CREATED) public CaseResponse create(@Valid @RequestBody CreateCaseRequest body,Authentication auth,HttpServletRequest req){return service.createCase(body,auth.getName(),ip(req));}
    @GetMapping("/cases/{id}/events") public List<CaseEventResponse> events(@PathVariable UUID id,Authentication auth){return service.customerEvents(id,auth.getName());}
    @PostMapping("/cases/{id}/messages") public CaseResponse message(@PathVariable UUID id,@Valid @RequestBody CustomerMessageRequest body,Authentication auth,HttpServletRequest req){return service.customerMessage(id,body,auth.getName(),ip(req));}
    private String ip(HttpServletRequest r){String x=r.getHeader("X-Forwarded-For");return x==null||x.isBlank()?r.getRemoteAddr():x.split(",")[0].trim();}
}
