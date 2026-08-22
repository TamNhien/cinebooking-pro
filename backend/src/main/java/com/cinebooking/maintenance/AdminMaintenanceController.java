package com.cinebooking.maintenance;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import static com.cinebooking.maintenance.MaintenanceDtos.*;

@RestController
@RequestMapping("/api/admin/maintenance")
public class AdminMaintenanceController {
    private final MaintenanceService service;
    public AdminMaintenanceController(MaintenanceService service){this.service=service;}

    @GetMapping("/cinemas") public List<CinemaOption> cinemas(Authentication auth){return service.cinemaOptions(auth.getName());}
    @GetMapping("/auditoriums") public List<AuditoriumOption> auditoriums(@RequestParam(required=false) UUID cinemaId,Authentication auth){return service.auditoriumOptions(auth.getName(),cinemaId);}
    @GetMapping("/staff-options") public List<StaffOption> staff(@RequestParam(required=false) UUID cinemaId,Authentication auth){return service.staffOptions(auth.getName(),cinemaId);}
    @GetMapping("/incident-options") public List<IncidentOption> incidents(@RequestParam(required=false) UUID cinemaId,Authentication auth){return service.incidentOptions(auth.getName(),cinemaId);}
    @GetMapping("/summary") public MaintenanceSummary summary(@RequestParam(required=false) UUID cinemaId,Authentication auth){return service.summary(auth.getName(),cinemaId);}

    @GetMapping("/assets") public List<AssetResponse> assets(@RequestParam(required=false) UUID cinemaId,Authentication auth){return service.assets(auth.getName(),cinemaId);}
    @PostMapping("/assets") @ResponseStatus(HttpStatus.CREATED) public AssetResponse createAsset(@Valid @RequestBody AssetRequest body,Authentication auth,HttpServletRequest req){return service.createAsset(body,auth.getName(),ip(req));}
    @PutMapping("/assets/{id}") public AssetResponse updateAsset(@PathVariable UUID id,@Valid @RequestBody AssetRequest body,Authentication auth,HttpServletRequest req){return service.updateAsset(id,body,auth.getName(),ip(req));}

    @GetMapping("/work-orders") public List<WorkOrderResponse> orders(@RequestParam(required=false) UUID cinemaId,Authentication auth){return service.workOrders(auth.getName(),cinemaId);}
    @PostMapping("/work-orders") @ResponseStatus(HttpStatus.CREATED) public WorkOrderResponse createOrder(@Valid @RequestBody WorkOrderCreateRequest body,Authentication auth,HttpServletRequest req){return service.createWorkOrder(body,auth.getName(),ip(req));}
    @PutMapping("/work-orders/{id}/plan") public WorkOrderResponse plan(@PathVariable UUID id,@Valid @RequestBody WorkOrderPlanRequest body,Authentication auth,HttpServletRequest req){return service.planWorkOrder(id,body,auth.getName(),ip(req));}
    @PostMapping("/work-orders/{id}/transition") public WorkOrderResponse transition(@PathVariable UUID id,@Valid @RequestBody WorkOrderTransitionRequest body,Authentication auth,HttpServletRequest req){return service.transition(id,body,auth.getName(),ip(req));}
    @GetMapping("/work-orders/{id}/events") public List<WorkOrderEventResponse> events(@PathVariable UUID id,Authentication auth){return service.events(id,auth.getName());}

    private String ip(HttpServletRequest r){String x=r.getHeader("X-Forwarded-For");return x==null||x.isBlank()?r.getRemoteAddr():x.split(",")[0].trim();}
}
