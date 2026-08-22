package com.cinebooking.staffops;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import static com.cinebooking.staffops.StaffOpsDtos.*;

@RestController
@RequestMapping("/api/staff/operations")
public class StaffOperationsController {
    private final StaffOperationsService service;
    public StaffOperationsController(StaffOperationsService service){this.service=service;}
    @GetMapping("/cinemas") public List<OperationsCinemaOption> cinemas(Authentication auth){return service.cinemas(auth.getName());}
    @GetMapping("/live") public OperationsLiveSnapshot live(@RequestParam(required=false) UUID cinemaId,Authentication auth){return service.live(auth.getName(),cinemaId);}
    @GetMapping("/staff-options") public List<OperationsStaffOption> staffOptions(@RequestParam(required=false) UUID cinemaId,Authentication auth){return service.staffOptions(auth.getName(),cinemaId);}
    @GetMapping("/handovers") public List<HandoverResponse> handovers(@RequestParam(required=false) UUID cinemaId,Authentication auth){return service.handovers(auth.getName(),cinemaId);}
    @PostMapping("/handovers") @ResponseStatus(HttpStatus.CREATED) public HandoverResponse createHandover(@Valid @RequestBody HandoverCreateRequest body,Authentication auth,HttpServletRequest req){return service.createHandover(body,auth.getName(),ip(req));}
    @PostMapping("/handovers/{id}/accept") public HandoverResponse acceptHandover(@PathVariable UUID id,Authentication auth,HttpServletRequest req){return service.acceptHandover(id,auth.getName(),ip(req));}
    @GetMapping("/incidents") public List<IncidentResponse> incidents(@RequestParam(required=false) UUID cinemaId,Authentication auth){return service.incidents(auth.getName(),cinemaId);}
    @PostMapping("/incidents") @ResponseStatus(HttpStatus.CREATED) public IncidentResponse createIncident(@Valid @RequestBody IncidentCreateRequest body,Authentication auth,HttpServletRequest req){return service.createIncident(body,auth.getName(),ip(req));}
    @PostMapping("/incidents/{id}/resolve") public IncidentResponse resolveIncident(@PathVariable UUID id,@Valid @RequestBody IncidentResolveRequest body,Authentication auth,HttpServletRequest req){return service.resolveIncident(id,body,auth.getName(),ip(req));}
    private String ip(HttpServletRequest r){String x=r.getHeader("X-Forwarded-For");return x==null||x.isBlank()?r.getRemoteAddr():x.split(",")[0].trim();}
}
