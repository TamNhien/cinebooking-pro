package com.cinebooking.waitlist;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import static com.cinebooking.waitlist.WaitlistDtos.*;

@RestController
@RequestMapping("/api/waitlist")
public class ShowtimeWaitlistController {
    private final ShowtimeWaitlistService service;
    public ShowtimeWaitlistController(ShowtimeWaitlistService service){this.service=service;}
    @GetMapping("/showtimes/{showtimeId}") public WaitlistStatus status(@PathVariable UUID showtimeId,Authentication a){return service.status(showtimeId,a.getName());}
    @PostMapping("/showtimes/{showtimeId}") public WaitlistStatus subscribe(@PathVariable UUID showtimeId,Authentication a){return service.subscribe(showtimeId,a.getName());}
    @DeleteMapping("/showtimes/{showtimeId}") public WaitlistStatus unsubscribe(@PathVariable UUID showtimeId,Authentication a){return service.unsubscribe(showtimeId,a.getName());}
    @GetMapping("/me") public List<WaitlistItem> mine(Authentication a){return service.mine(a.getName());}
}
