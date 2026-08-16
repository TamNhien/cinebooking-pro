package com.cinebooking.staffops;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.CinemaRepository;
import com.cinebooking.user.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import static com.cinebooking.staffops.StaffOpsDtos.*;

@Service
public class StaffTimesheetService {
    private final StaffShiftRepository shifts; private final StaffAttendanceRepository attendance; private final StaffLeaveRequestRepository leaves; private final StaffProfileRepository profiles; private final UserRepository users; private final CinemaRepository cinemas; private final ZoneId zone;
    public StaffTimesheetService(StaffShiftRepository shifts,StaffAttendanceRepository attendance,StaffLeaveRequestRepository leaves,StaffProfileRepository profiles,UserRepository users,CinemaRepository cinemas,@Value("${app.staff.time-zone:Asia/Ho_Chi_Minh}") String zone){this.shifts=shifts;this.attendance=attendance;this.leaves=leaves;this.profiles=profiles;this.users=users;this.cinemas=cinemas;this.zone=ZoneId.of(zone);}

    public TimesheetReport report(YearMonth month,UUID requestedCinema,String actorEmail){
        AppUser actor=users.findByEmailIgnoreCase(actorEmail).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản"));if(actor.getRole()!=Role.ADMIN&&actor.getRole()!=Role.MANAGER)throw new ApiException(HttpStatus.FORBIDDEN,"Chỉ Manager/Admin được xem bảng công");
        YearMonth m=month==null?YearMonth.now(zone):month;if(m.isBefore(YearMonth.now(zone).minusYears(2))||m.isAfter(YearMonth.now(zone).plusMonths(6)))throw new ApiException(HttpStatus.BAD_REQUEST,"Tháng báo cáo nằm ngoài phạm vi cho phép");
        UUID cinemaId=requestedCinema;if(actor.getRole()==Role.MANAGER){UUID own=profiles.findById(actor.getId()).map(StaffProfile::getCinemaId).orElseThrow(()->new ApiException(HttpStatus.FORBIDDEN,"Manager chưa được phân rạp"));if(cinemaId!=null&&!cinemaId.equals(own))throw new ApiException(HttpStatus.FORBIDDEN,"Manager chỉ được xem bảng công tại rạp của mình");cinemaId=own;}
        LocalDate from=m.atDay(1),to=m.atEndOfMonth();Instant fromI=from.atStartOfDay(zone).toInstant(),toI=to.plusDays(1).atStartOfDay(zone).minusNanos(1).toInstant();LocalDate today=LocalDate.now(zone);Instant now=Instant.now();
        final UUID selectedCinema=cinemaId;
        List<StaffProfile> ps=profiles.findAllByDeletedAtIsNullOrderByEmployeeCodeAsc().stream().filter(p->p.getCinemaId()!=null).filter(p->selectedCinema==null||selectedCinema.equals(p.getCinemaId())).filter(p->"ACTIVE".equals(p.getEmploymentStatus())||"ON_LEAVE".equals(p.getEmploymentStatus())).toList();
        List<TimesheetRow> rows=new ArrayList<>();
        for(StaffProfile p:ps){AppUser u=users.findById(p.getUserId()).orElse(null);if(u==null||!(u.getRole()==Role.STAFF||u.getRole()==Role.MANAGER))continue;List<StaffShift> ss=shifts.findByStaffUserIdAndShiftDateBetweenOrderByShiftDateAscStartTimeAsc(p.getUserId(),from,to).stream().filter(s->!"CANCELLED".equals(s.getStatus())).toList();List<StaffAttendance> aa=attendance.findByStaffUserIdAndCheckInAtBetweenOrderByCheckInAtAsc(p.getUserId(),fromI,toI);Map<UUID,StaffAttendance> byShift=new HashMap<>();for(StaffAttendance a:aa)byShift.put(a.getShiftId(),a);
            long scheduledMinutes=0,worked=0,late=0,early=0;int completed=0,absent=0;for(StaffShift s:ss){scheduledMinutes+=shiftMinutes(s);StaffAttendance a=byShift.get(s.getId());if(a!=null){if(a.getCheckOutAt()!=null)completed++;worked+=a.getWorkedMinutes()!=null?a.getWorkedMinutes():Math.max(0,Duration.between(a.getCheckInAt(),a.getCheckOutAt()==null?now:a.getCheckOutAt()).toMinutes());late+=a.getLateMinutes();early+=a.getEarlyLeaveMinutes();}else {ZonedDateTime end=StaffShiftRules.end(s.getShiftDate(),s.getStartTime(),s.getEndTime(),zone);if(end.toInstant().isBefore(now)&&!s.getShiftDate().isAfter(today))absent++;}}
            long leaveDays=countApprovedLeaveDays(p.getUserId(),from,to);String cn=cinemas.findById(p.getCinemaId()).map(Cinema::getName).orElse("-");rows.add(new TimesheetRow(p.getUserId(),p.getEmployeeCode(),u.getFullName(),p.getCinemaId(),cn,ss.size(),completed,absent,scheduledMinutes,worked,late,early,leaveDays));
        }
        rows.sort(Comparator.comparing(TimesheetRow::employeeCode));long totalScheduled=rows.stream().mapToLong(TimesheetRow::scheduledMinutes).sum(),totalWorked=rows.stream().mapToLong(TimesheetRow::workedMinutes).sum(),totalLate=rows.stream().mapToLong(TimesheetRow::lateMinutes).sum(),totalEarly=rows.stream().mapToLong(TimesheetRow::earlyLeaveMinutes).sum();int totalAbsent=rows.stream().mapToInt(TimesheetRow::absentShifts).sum();String cn=cinemaId==null?"Tất cả rạp":cinemas.findById(cinemaId).map(Cinema::getName).orElse("-");return new TimesheetReport(m,cinemaId,cn,rows,totalScheduled,totalWorked,totalLate,totalEarly,totalAbsent);
    }

    private long shiftMinutes(StaffShift s){ZonedDateTime a=StaffShiftRules.start(s.getShiftDate(),s.getStartTime(),zone),b=StaffShiftRules.end(s.getShiftDate(),s.getStartTime(),s.getEndTime(),zone);return Math.max(0,Duration.between(a,b).toMinutes());}
    private long countApprovedLeaveDays(UUID staff,LocalDate from,LocalDate to){Set<LocalDate> days=new HashSet<>();for(StaffLeaveRequest r:leaves.approvedOverlap(staff,from,to)){LocalDate a=r.getFromDate().isBefore(from)?from:r.getFromDate(),b=r.getToDate().isAfter(to)?to:r.getToDate();for(LocalDate d=a;!d.isAfter(b);d=d.plusDays(1))days.add(d);}return days.size();}
}
