package com.cinebooking.notification;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.*;
import static com.cinebooking.notification.NotificationDtos.*;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService s;
    public NotificationController(NotificationService s){this.s=s;}
    @GetMapping public List<NotificationResponse> list(Authentication a){return s.list(a.getName());}
    @GetMapping("/summary") public NotificationSummary summary(Authentication a){return s.summary(a.getName());}
    @GetMapping("/browser-feed") public List<NotificationResponse> browser(@RequestParam(required=false) Instant after,Authentication a){return s.browserFeed(a.getName(),after);}
    @GetMapping("/preferences") public PreferenceResponse preferences(Authentication a){return s.preference(a.getName());}
    @PutMapping("/preferences") public PreferenceResponse preferences(@Valid @RequestBody PreferenceUpdate req,Authentication a){return s.updatePreference(a.getName(),req);}
    @PostMapping("/test") public NotificationResponse test(Authentication a){return s.test(a.getName());}
    @PostMapping("/{id}/read") public NotificationResponse read(@PathVariable UUID id,Authentication a){return s.read(id,a.getName());}
    @PostMapping("/read-all") public void all(Authentication a){s.readAll(a.getName());}
    @DeleteMapping("/{id}") public void delete(@PathVariable UUID id,Authentication a){s.delete(id,a.getName());}
}
