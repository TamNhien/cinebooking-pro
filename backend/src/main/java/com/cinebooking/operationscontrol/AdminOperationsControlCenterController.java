package com.cinebooking.operationscontrol;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.cinebooking.operationscontrol.OperationsControlCenterDtos.*;

@RestController
@RequestMapping("/api/admin/operations-control")
public class AdminOperationsControlCenterController {
    private final OperationsControlCenterService service;

    public AdminOperationsControlCenterController(OperationsControlCenterService service) {
        this.service = service;
    }

    @GetMapping("/cinemas")
    public List<CinemaOption> cinemas(Authentication authentication) {
        return service.cinemaOptions(authentication.getName());
    }

    @GetMapping("/snapshot")
    public Snapshot snapshot(@RequestParam(required = false) UUID cinemaId, Authentication authentication) {
        return service.snapshot(authentication.getName(), cinemaId);
    }

    @PostMapping("/alerts/{fingerprint}/acknowledge")
    public Snapshot acknowledge(@PathVariable String fingerprint,
                                @RequestBody(required = false) AlertActionRequest request,
                                Authentication authentication) {
        UUID cinemaId = request == null ? null : request.cinemaId();
        String note = request == null ? null : request.note();
        return service.acknowledge(authentication.getName(), cinemaId, fingerprint, note);
    }

    @PostMapping("/alerts/{fingerprint}/resolve")
    public Snapshot resolve(@PathVariable String fingerprint,
                            @RequestBody(required = false) AlertActionRequest request,
                            Authentication authentication) {
        UUID cinemaId = request == null ? null : request.cinemaId();
        String note = request == null ? null : request.note();
        return service.resolve(authentication.getName(), cinemaId, fingerprint, note);
    }

    @GetMapping("/alerts/history")
    public List<AlertHistoryItem> history(@RequestParam(required = false) UUID cinemaId,
                                          Authentication authentication) {
        return service.history(authentication.getName(), cinemaId);
    }
}
