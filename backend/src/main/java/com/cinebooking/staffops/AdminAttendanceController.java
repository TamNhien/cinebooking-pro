package com.cinebooking.staffops;

import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.*;
import java.util.*;
import static com.cinebooking.staffops.StaffOpsDtos.*;

@RestController
@RequestMapping("/api/admin/attendance")
public class AdminAttendanceController {
    private final StaffLeaveService leaves; private final StaffTimesheetService timesheets;
    public AdminAttendanceController(StaffLeaveService leaves,StaffTimesheetService timesheets){this.leaves=leaves;this.timesheets=timesheets;}
    @GetMapping("/leaves") public List<LeaveResponse> leaves(@RequestParam(required=false) String status,@RequestParam(required=false) LocalDate from,@RequestParam(required=false) LocalDate to,Authentication auth){return leaves.adminList(status,from,to,auth.getName());}
    @PostMapping("/leaves/{id}/review") public LeaveResponse review(@PathVariable UUID id,@Valid @RequestBody LeaveReviewRequest req,Authentication auth){return leaves.review(id,req,auth.getName());}
    @GetMapping("/timesheet") public TimesheetReport timesheet(@RequestParam(required=false) YearMonth month,@RequestParam(required=false) UUID cinemaId,Authentication auth){return timesheets.report(month,cinemaId,auth.getName());}
}
