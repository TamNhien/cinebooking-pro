package com.cinebooking.booking;

import com.cinebooking.domain.BookingStatus;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static com.cinebooking.booking.BookingDtos.BookingResponse;

@RestController
@RequestMapping("/api/admin/bookings")
public class AdminBookingController {
    private final BookingRepository repo; private final BookingService service;
    public AdminBookingController(BookingRepository repo, BookingService service){this.repo=repo;this.service=service;}
    @GetMapping public List<BookingResponse> all(){ return repo.findAll().stream().map(service::toDto).toList(); }
    @PostMapping("/{id}/cancel") public BookingResponse cancel(@PathVariable UUID id){return service.adminCancel(id);}
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id){service.adminDelete(id);}
    @PostMapping("/expire-now") public int expireNow(){
        var list=repo.findByStatusAndExpiresAtBefore(BookingStatus.PENDING, Instant.now());
        list.forEach(b->service.cancelPending(b.getId(),BookingStatus.EXPIRED)); return list.size();
    }
}
