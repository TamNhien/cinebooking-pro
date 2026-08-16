package com.cinebooking.staffops;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;
import static com.cinebooking.staffops.StaffOpsDtos.*;
@RestController @RequestMapping("/api/admin/shifts")
public class AdminShiftController {
    private final StaffShiftService service; public AdminShiftController(StaffShiftService service){this.service=service;}
    @GetMapping("/staff-options") public List<StaffOption> staffOptions(Authentication auth){return service.staffOptions(auth.getName());}
    @GetMapping("/cinema-options") public List<CinemaOption> cinemaOptions(Authentication auth){return service.cinemaOptions(auth.getName());}
    @GetMapping public List<ShiftResponse> list(@RequestParam(required=false) LocalDate from,@RequestParam(required=false) LocalDate to,Authentication auth){return service.list(from,to,auth.getName());}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public ShiftResponse create(@Valid @RequestBody ShiftRequest req,Authentication auth){return service.create(req,auth.getName());}
    @PutMapping("/{id}") public ShiftResponse update(@PathVariable UUID id,@Valid @RequestBody ShiftRequest req,Authentication auth){return service.update(id,req,auth.getName());}
    @PostMapping("/{id}/cancel") @ResponseStatus(HttpStatus.NO_CONTENT) public void cancel(@PathVariable UUID id,Authentication auth){service.cancel(id,auth.getName());}
}
