package com.cinebooking.booking;

import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import static com.cinebooking.booking.BookingDtos.*;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {
    private final BookingService service;
    public BookingController(BookingService service){this.service=service;}

    @PostMapping
    public ResponseEntity<BookingResponse> create(@Valid @RequestBody CreateBookingRequest req,
                                                   @RequestHeader(value="Idempotency-Key", required=false) String idempotencyKey,
                                                   Authentication auth){
        BookingService.BookingCreateResult result=service.create(req,auth.getName(),idempotencyKey);
        HttpHeaders headers=new HttpHeaders();
        headers.set("Idempotency-Replayed", Boolean.toString(result.replayed()));
        return new ResponseEntity<>(result.booking(),headers,result.replayed()?HttpStatus.OK:HttpStatus.CREATED);
    }

    @GetMapping("/me") public List<BookingResponse> mine(Authentication auth){return service.mine(auth.getName());}
    @GetMapping("/pending") public BookingResponse pending(@RequestParam UUID showtimeId, Authentication auth){return service.pendingForShowtime(auth.getName(),showtimeId);}
    @PostMapping("/{id}/cancel") public BookingResponse cancel(@PathVariable UUID id, Authentication auth){return service.cancelOwnedPending(id,auth.getName());}
    @GetMapping("/{id}") public BookingResponse one(@PathVariable UUID id, Authentication auth){return service.getOwned(id,auth.getName());}
}
