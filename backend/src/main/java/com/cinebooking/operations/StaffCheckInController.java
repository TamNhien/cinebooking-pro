package com.cinebooking.operations;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/staff/check-in")
public class StaffCheckInController {
    private final CheckInService service; public StaffCheckInController(CheckInService s){service=s;}
    @PostMapping("/preview") public CheckInService.Preview preview(@Valid @RequestBody Request body, Authentication auth){return service.preview(body.payload(),auth.getName());}
    @PostMapping public CheckInService.Result check(@Valid @RequestBody Request body, Authentication auth, HttpServletRequest req){return service.checkIn(body.payload(),auth.getName(),clientIp(req));}
    @GetMapping("/history") public List<CheckInService.HistoryItem> history(Authentication auth){return service.history(auth.getName());}
    private String clientIp(HttpServletRequest r){String x=r.getHeader("X-Forwarded-For");return x==null||x.isBlank()?r.getRemoteAddr():x.split(",")[0].trim();}
    public record Request(@NotBlank String payload){}
}
