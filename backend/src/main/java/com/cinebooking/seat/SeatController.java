package com.cinebooking.seat;

import com.cinebooking.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import static com.cinebooking.seat.SeatDtos.*;

@RestController
@RequestMapping("/api/showtimes/{showtimeId}")
public class SeatController {
    private final SeatService service; private final UserRepository users;
    public SeatController(SeatService service, UserRepository users){this.service=service;this.users=users;}

    @GetMapping("/seats")
    public SeatMapResponse seats(@PathVariable UUID showtimeId, Authentication auth) {
        return service.map(showtimeId, optionalUserId(auth));
    }

    @GetMapping("/seat-suggestions")
    public SeatSuggestionResponse suggestions(@PathVariable UUID showtimeId,
                                              @RequestParam(defaultValue="2") int count,
                                              Authentication auth) {
        return service.suggestions(showtimeId,count,optionalUserId(auth));
    }

    @PostMapping("/selection-validation")
    public SelectionValidationResponse validateSelection(@PathVariable UUID showtimeId,
                                                         @Valid @RequestBody HoldRequest req,
                                                         Authentication auth) {
        return service.validateSelection(showtimeId,req.seatIds(),optionalUserId(auth));
    }

    @PostMapping("/holds")
    public HoldResponse hold(@PathVariable UUID showtimeId, @Valid @RequestBody HoldRequest req, Authentication auth) {
        return service.hold(showtimeId, req.seatIds(), userId(auth));
    }

    @DeleteMapping("/holds")
    public void release(@PathVariable UUID showtimeId, @Valid @RequestBody HoldRequest req, Authentication auth) {
        service.release(showtimeId, req.seatIds(), userId(auth));
    }

    private UUID optionalUserId(Authentication auth){return auth==null?null:users.findByEmailIgnoreCase(auth.getName()).map(u->u.getId()).orElse(null);}
    private UUID userId(Authentication auth){ return users.findByEmailIgnoreCase(auth.getName()).orElseThrow().getId(); }
}
