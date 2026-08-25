package com.cinebooking.notification;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import static com.cinebooking.notification.PwaDtos.*;

@RestController
@RequestMapping("/api/pwa")
public class PwaController {
    private final PwaDeviceService service;
    public PwaController(PwaDeviceService service){this.service=service;}

    @GetMapping("/config") public PushConfig config(){return service.config();}
    @GetMapping("/devices") public List<DeviceResponse> devices(@RequestParam(required=false) String currentDeviceKey,Authentication auth){return service.list(auth.getName(),currentDeviceKey);}
    @PutMapping("/devices/{deviceKey}") public DeviceResponse register(@PathVariable String deviceKey,@Valid @RequestBody DeviceRegistration request,Authentication auth){return service.register(auth.getName(),deviceKey,request);}
    @PostMapping("/devices/{deviceKey}/seen") public DeviceResponse seen(@PathVariable String deviceKey,Authentication auth){return service.seen(auth.getName(),deviceKey);}
    @DeleteMapping("/devices/{deviceKey}") public void remove(@PathVariable String deviceKey,Authentication auth){service.remove(auth.getName(),deviceKey);}
}
