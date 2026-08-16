package com.cinebooking.staffops;

import com.cinebooking.audit.AuditService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.CinemaRepository;
import com.cinebooking.operations.TicketCheckInLogRepository;
import com.cinebooking.user.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static com.cinebooking.staffops.StaffOpsDtos.*;

@Service
public class StaffAttendanceService {
    private final StaffShiftRepository shifts; private final StaffAttendanceRepository attendance; private final UserRepository users; private final StaffProfileRepository profiles; private final CinemaRepository cinemas; private final AuditService audit; private final TicketCheckInLogRepository checkins; private final ZoneId zone; private final long early; private final long lateGrace; private final long earlyLeaveGrace;
    public StaffAttendanceService(StaffShiftRepository shifts,StaffAttendanceRepository attendance,UserRepository users,StaffProfileRepository profiles,CinemaRepository cinemas,AuditService audit,TicketCheckInLogRepository checkins,@Value("${app.staff.time-zone:Asia/Ho_Chi_Minh}") String zone,@Value("${app.staff.attendance-start-early-minutes:30}") long early,@Value("${app.staff.attendance-late-grace-minutes:5}") long lateGrace,@Value("${app.staff.attendance-early-leave-grace-minutes:5}") long earlyLeaveGrace){this.shifts=shifts;this.attendance=attendance;this.users=users;this.profiles=profiles;this.cinemas=cinemas;this.audit=audit;this.checkins=checkins;this.zone=ZoneId.of(zone);this.early=early;this.lateGrace=lateGrace;this.earlyLeaveGrace=earlyLeaveGrace;}

    public List<ShiftResponse> mySchedule(String email,LocalDate from,LocalDate to){AppUser u=user(email);LocalDate f=from==null?LocalDate.now(zone).minusDays(2):from;LocalDate t=to==null?f.plusDays(30):to;return shifts.findByStaffUserIdAndShiftDateBetweenOrderByShiftDateAscStartTimeAsc(u.getId(),f,t).stream().map(this::shiftDto).toList();}
    public AttendanceResponse current(String email){AppUser u=user(email);return attendance.findFirstByStaffUserIdAndCheckOutAtIsNullOrderByCheckInAtDesc(u.getId()).map(this::attendanceDto).orElse(null);}
    public List<AttendanceResponse> history(String email){AppUser u=user(email);return attendance.findTop50ByStaffUserIdOrderByCheckInAtDesc(u.getId()).stream().map(this::attendanceDto).toList();}

    @Transactional public AttendanceResponse start(UUID shiftId,String email,String ip){
        AppUser u=user(email); StaffProfile p=profile(u); validateWorking(u,p); StaffShift s=shifts.findById(shiftId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy ca làm")); if(!s.getStaffUserId().equals(u.getId()))throw new ApiException(HttpStatus.FORBIDDEN,"Ca làm này không được phân cho bạn"); if(!Objects.equals(p.getCinemaId(),s.getCinemaId()))throw new ApiException(HttpStatus.CONFLICT,"Bạn đã được chuyển rạp; ca cũ không còn hợp lệ"); if(!"SCHEDULED".equals(s.getStatus()))throw new ApiException(HttpStatus.CONFLICT,"Ca làm không ở trạng thái có thể bắt đầu"); if(attendance.findByShiftId(shiftId).isPresent())throw new ApiException(HttpStatus.CONFLICT,"Ca này đã được chấm công"); if(attendance.findFirstByStaffUserIdAndCheckOutAtIsNullOrderByCheckInAtDesc(u.getId()).isPresent())throw new ApiException(HttpStatus.CONFLICT,"Bạn đang có một ca chưa kết thúc");
        ZonedDateTime now=ZonedDateTime.now(zone); ZonedDateTime startAt=StaffShiftRules.start(s.getShiftDate(),s.getStartTime(),zone); ZonedDateTime endAt=StaffShiftRules.end(s.getShiftDate(),s.getStartTime(),s.getEndTime(),zone); if(now.isBefore(startAt.minusMinutes(early)))throw new ApiException(HttpStatus.CONFLICT,"Chưa đến giờ bắt đầu ca. Bạn có thể bắt đầu từ "+startAt.minusMinutes(early).toLocalTime()+" ("+zone+")"); if(!now.isBefore(endAt))throw new ApiException(HttpStatus.CONFLICT,"Ca làm đã kết thúc lúc "+endAt.toLocalTime()+" ngày "+endAt.toLocalDate()+" ("+zone+"). Nếu là ca tối đến 12 giờ đêm, hãy xếp 20:00-00:00."); if(!StaffShiftRules.canStartShift(now,s.getShiftDate(),s.getStartTime(),s.getEndTime(),zone,early))throw new ApiException(HttpStatus.CONFLICT,"Không thể bắt đầu ca tại thời điểm hiện tại");
        Instant checkIn=Instant.now();long rawLate=Math.max(0,Duration.between(startAt.toInstant(),checkIn).toMinutes());int late=(int)Math.max(0,rawLate-lateGrace);
        StaffAttendance a=new StaffAttendance();a.setShiftId(s.getId());a.setStaffUserId(u.getId());a.setCinemaId(s.getCinemaId());a.setCheckInAt(checkIn);a.setStatus("WORKING");a.setCheckInIp(ip);a.setLateMinutes(late);a.setEarlyLeaveMinutes(0);a.setPunctualityStatus(late>0?"LATE":"ON_TIME");attendance.save(a);audit.record(email,"SHIFT_CHECK_IN","STAFF_SHIFT",s.getId().toString(),p.getEmployeeCode()+" bắt đầu ca"+(late>0?" · đi trễ "+late+" phút":" · đúng giờ"),ip);return attendanceDto(a);
    }

    @Transactional public AttendanceResponse end(String email,String ip){
        AppUser u=user(email);StaffAttendance a=attendance.findFirstByStaffUserIdAndCheckOutAtIsNullOrderByCheckInAtDesc(u.getId()).orElseThrow(()->new ApiException(HttpStatus.CONFLICT,"Bạn chưa bắt đầu ca"));StaffShift s=shifts.findById(a.getShiftId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy ca làm"));Instant now=Instant.now();ZonedDateTime endAt=StaffShiftRules.end(s.getShiftDate(),s.getStartTime(),s.getEndTime(),zone);long rawEarly=Math.max(0,Duration.between(now,endAt.toInstant()).toMinutes());int earlyMinutes=(int)Math.max(0,rawEarly-earlyLeaveGrace);int worked=(int)Math.max(0,Duration.between(a.getCheckInAt(),now).toMinutes());a.setCheckOutAt(now);a.setCheckOutIp(ip);a.setStatus("COMPLETED");a.setEarlyLeaveMinutes(earlyMinutes);a.setWorkedMinutes(worked);a.setPunctualityStatus(punctuality(a.getLateMinutes(),earlyMinutes));attendance.save(a);s.setStatus("COMPLETED");shifts.save(s);audit.record(email,"SHIFT_CHECK_OUT","STAFF_SHIFT",a.getShiftId().toString(),"Kết thúc ca · làm "+worked+" phút"+(earlyMinutes>0?" · về sớm "+earlyMinutes+" phút":""),ip);return attendanceDto(a);
    }

    private String punctuality(int late,int earlyLeave){if(late>0&&earlyLeave>0)return "LATE_EARLY";if(late>0)return "LATE";if(earlyLeave>0)return "EARLY";return "ON_TIME";}
    private AppUser user(String email){AppUser u=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản"));if(u.getRole()!=Role.STAFF&&u.getRole()!=Role.MANAGER)throw new ApiException(HttpStatus.FORBIDDEN,"Tài khoản này không phải nhân viên rạp");return u;}
    private StaffProfile profile(AppUser u){return profiles.findById(u.getId()).orElseThrow(()->new ApiException(HttpStatus.FORBIDDEN,"Tài khoản chưa có hồ sơ nhân viên"));}
    private void validateWorking(AppUser u,StaffProfile p){if(!u.isAccountEnabled()||!"ACTIVE".equals(p.getEmploymentStatus()))throw new ApiException(HttpStatus.FORBIDDEN,"Tài khoản nhân viên hiện không hoạt động");if(p.getCinemaId()==null)throw new ApiException(HttpStatus.FORBIDDEN,"Nhân viên chưa được phân rạp");}
    private ShiftResponse shiftDto(StaffShift s){StaffProfile p=profiles.findById(s.getStaffUserId()).orElseThrow();AppUser u=users.findById(s.getStaffUserId()).orElseThrow();String cn=cinemas.findById(s.getCinemaId()).map(Cinema::getName).orElse("-");var a=attendance.findByShiftId(s.getId()).orElse(null);return new ShiftResponse(s.getId(),u.getId(),p.getEmployeeCode(),u.getFullName(),s.getCinemaId(),cn,s.getShiftDate(),s.getStartTime(),s.getEndTime(),s.getStatus(),s.getNote(),a==null?null:a.getCheckInAt(),a==null?null:a.getCheckOutAt(),checkins.countByShiftId(s.getId()),a==null?null:a.getLateMinutes(),a==null?null:a.getEarlyLeaveMinutes(),a==null?null:a.getWorkedMinutes(),a==null?null:a.getPunctualityStatus());}
    private AttendanceResponse attendanceDto(StaffAttendance a){String cn=cinemas.findById(a.getCinemaId()).map(Cinema::getName).orElse("-");return new AttendanceResponse(a.getId(),a.getShiftId(),a.getStaffUserId(),a.getCinemaId(),cn,a.getCheckInAt(),a.getCheckOutAt(),a.getStatus(),a.getLateMinutes(),a.getEarlyLeaveMinutes(),a.getWorkedMinutes(),a.getPunctualityStatus());}
}
