package com.cinebooking.commandcenter;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

import static com.cinebooking.commandcenter.CommandCenterDtos.*;

@RestController
@RequestMapping("/api/admin/command-center")
public class AdminCommandCenterController {
    private final CommandCenterService service;

    public AdminCommandCenterController(CommandCenterService service) {
        this.service = service;
    }

    @GetMapping("/cinemas")
    public List<CinemaOption> cinemas(Authentication authentication) {
        return service.cinemaOptions(authentication.getName());
    }

    @GetMapping("/summary")
    public Summary summary(@RequestParam(required = false) UUID cinemaId, Authentication authentication) {
        return service.summary(authentication.getName(), cinemaId);
    }
}
