package com.cinebooking.staffops;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.domain.Cinema;
import com.cinebooking.movie.CinemaRepository;
import com.cinebooking.user.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.*;
import static com.cinebooking.staffops.StaffOpsDtos.*;

@Service
public class StaffGatePolicyService {
    private final UserRepository users; private final StaffProfileRepository profiles; private final StaffAttendanceRepository attendance; private final StaffShiftRepository shifts; private final StaffAttendanceService attendanceService; private final CinemaRepository cinemas; private final ZoneId zone; private final long grace;
    public StaffGatePolicyService(UserRepository users,StaffProfileRepository profiles,StaffAttendanceRepository attendance,StaffShiftRepository shifts,StaffAttendanceService attendanceService,CinemaRepository cinemas,@Value("${app.staff.time-zone:Asia/Ho_Chi_Minh}") String zone,@Value("${app.staff.scan-grace-minutes:30}") long grace){this.users=users;this.profiles=profiles;this.attendance=attendance;this.shifts=shifts;this.attendanceService=attendanceService;this.cinemas=cinemas;this.zone=ZoneId.of(zone);this.grace=grace;}
    public void requireCanScan(String email,UUID ticketCinemaId){
        AppUser u=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản"));
        if(u.getRole()==Role.ADMIN)return;
        if(u.getRole()!=Role.STAFF&&u.getRole()!=Role.MANAGER)throw new ApiException(HttpStatus.FORBIDDEN,"Tài khoản không có quyền soát vé");
        if(!u.isAccountEnabled())throw new ApiException(HttpStatus.FORBIDDEN,"Tài khoản nhân viên đã bị khoá");
        StaffProfile p=profiles.findById(u.getId()).orElseThrow(()->new ApiException(HttpStatus.FORBIDDEN,"Không tìm thấy hồ sơ nhân viên"));
        if(!"ACTIVE".equals(p.getEmploymentStatus()))throw new ApiException(HttpStatus.FORBIDDEN,"Nhân viên hiện không ở trạng thái làm việc");
        StaffAttendance a=attendance.findFirstByStaffUserIdAndCheckOutAtIsNullOrderByCheckInAtDesc(u.getId()).orElseThrow(()->new ApiException(HttpStatus.FORBIDDEN,"Bạn phải bắt đầu ca làm trước khi quét vé"));
        // V17.1: ca đang chấm công là nguồn sự thật cho quyền soát vé hiện tại.
        // staff_profile.cinema_id là rạp phân công mặc định cho các ca tiếp theo.
        if(!Objects.equals(a.getCinemaId(),ticketCinemaId))throw new ApiException(HttpStatus.FORBIDDEN,"Sai ca: bạn đang làm tại "+cinemaName(a.getCinemaId())+", nhưng vé thuộc "+cinemaName(ticketCinemaId)+".");
        StaffShift s=shifts.findById(a.getShiftId()).orElseThrow(()->new ApiException(HttpStatus.FORBIDDEN,"Không tìm thấy ca đang làm"));
        ZonedDateTime now=ZonedDateTime.now(zone);
        if(!StaffShiftRules.scanWindowStillOpen(now,s.getShiftDate(),s.getStartTime(),s.getEndTime(),zone,grace))throw new ApiException(HttpStatus.FORBIDDEN,"Ca làm đã kết thúc, vui lòng kết thúc chấm công");
    }
    public GateStatus status(String email){
        AppUser u=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản"));
        if(u.getRole()==Role.ADMIN)return new GateStatus(true,"ADMIN có quyền check-in khẩn cấp",null);
        if(u.getRole()!=Role.STAFF&&u.getRole()!=Role.MANAGER)return new GateStatus(false,"Tài khoản không phải nhân viên",null);
        if(!u.isAccountEnabled())return new GateStatus(false,"Tài khoản nhân viên đã bị khoá",null);
        StaffProfile p=profiles.findById(u.getId()).orElse(null);
        if(p==null)return new GateStatus(false,"Tài khoản chưa có hồ sơ nhân viên",null);
        if(!"ACTIVE".equals(p.getEmploymentStatus()))return new GateStatus(false,"Nhân viên hiện không ở trạng thái làm việc",null);
        StaffAttendance active=attendance.findFirstByStaffUserIdAndCheckOutAtIsNullOrderByCheckInAtDesc(u.getId()).orElse(null);
        if(active==null)return new GateStatus(false,"Hãy bắt đầu ca làm trước khi quét vé",null);
        StaffShift shift=shifts.findById(active.getShiftId()).orElse(null);
        if(shift==null)return new GateStatus(false,"Không tìm thấy ca đang làm",attendanceService.current(email));
        if(!StaffShiftRules.scanWindowStillOpen(ZonedDateTime.now(zone),shift.getShiftDate(),shift.getStartTime(),shift.getEndTime(),zone,grace))return new GateStatus(false,"Ca làm đã kết thúc, vui lòng kết thúc chấm công",attendanceService.current(email));
        AttendanceResponse dto=attendanceService.current(email);
        String message="Đang trong ca tại "+dto.cinemaName();
        if(p.getCinemaId()!=null&&!Objects.equals(p.getCinemaId(),active.getCinemaId())){
            message += ". Hồ sơ hiện phân rạp "+cinemaName(p.getCinemaId())+"; thay đổi phân rạp áp dụng cho ca sau.";
        }
        return new GateStatus(true,message,dto);
    }
    private String cinemaName(UUID id){
        if(id==null)return "chưa phân rạp";
        return cinemas.findById(id).map(Cinema::getName).orElse(id.toString());
    }
}
