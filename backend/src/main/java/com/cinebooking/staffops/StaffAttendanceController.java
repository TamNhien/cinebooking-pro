package com.cinebooking.staffops;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;
import static com.cinebooking.staffops.StaffOpsDtos.*;
@RestController @RequestMapping("/api/staff")
public class StaffAttendanceController {
    private final StaffAttendanceService attendance; private final StaffGatePolicyService gate; private final StaffLeaveService leaves;
    public StaffAttendanceController(StaffAttendanceService attendance,StaffGatePolicyService gate,StaffLeaveService leaves){this.attendance=attendance;this.gate=gate;this.leaves=leaves;}
    @GetMapping("/schedule") public List<ShiftResponse> schedule(@RequestParam(required=false) LocalDate from,@RequestParam(required=false) LocalDate to,Authentication auth){return attendance.mySchedule(auth.getName(),from,to);}
    @GetMapping("/attendance/current") public AttendanceResponse current(Authentication auth){return attendance.current(auth.getName());}
    @GetMapping("/attendance/history") public List<AttendanceResponse> history(Authentication auth){return attendance.history(auth.getName());}
    @PostMapping("/attendance/start/{shiftId}") public AttendanceResponse start(@PathVariable UUID shiftId,Authentication auth,HttpServletRequest req){return attendance.start(shiftId,auth.getName(),ip(req));}
    @PostMapping("/attendance/end") public AttendanceResponse end(Authentication auth,HttpServletRequest req){return attendance.end(auth.getName(),ip(req));}
    @GetMapping("/gate-status") public GateStatus gateStatus(Authentication auth){return gate.status(auth.getName());}
    @GetMapping("/leaves") public List<LeaveResponse> leaves(Authentication auth){return leaves.mine(auth.getName());}
    @PostMapping("/leaves") public LeaveResponse createLeave(@jakarta.validation.Valid @RequestBody LeaveCreateRequest req,Authentication auth){return leaves.create(req,auth.getName());}
    @PostMapping("/leaves/{id}/cancel") public void cancelLeave(@PathVariable UUID id,Authentication auth){leaves.cancel(id,auth.getName());}
    private String ip(HttpServletRequest r){String x=r.getHeader("X-Forwarded-For");return x==null||x.isBlank()?r.getRemoteAddr():x.split(",")[0].trim();}
}
