package com.cinebooking.operationscontrol;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
}
