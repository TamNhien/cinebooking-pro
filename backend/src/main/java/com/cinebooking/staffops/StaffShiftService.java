package com.cinebooking.staffops;

import com.cinebooking.audit.AuditService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.CinemaRepository;
import com.cinebooking.operations.TicketCheckInLogRepository;
import com.cinebooking.notification.NotificationService;
import com.cinebooking.user.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static com.cinebooking.staffops.StaffOpsDtos.*;

@Service
public class StaffShiftService {
    private final StaffShiftRepository shifts; private final StaffAttendanceRepository attendance; private final StaffLeaveRequestRepository leaves; private final StaffProfileRepository profiles; private final UserRepository users; private final CinemaRepository cinemas; private final AuditService audit; private final TicketCheckInLogRepository checkins; private final NotificationService notifications; private final ZoneId zone;
    public StaffShiftService(StaffShiftRepository shifts,StaffAttendanceRepository attendance,StaffLeaveRequestRepository leaves,StaffProfileRepository profiles,UserRepository users,CinemaRepository cinemas,AuditService audit,TicketCheckInLogRepository checkins,NotificationService notifications,@Value("${app.staff.time-zone:Asia/Ho_Chi_Minh}") String zone){this.shifts=shifts;this.attendance=attendance;this.leaves=leaves;this.profiles=profiles;this.users=users;this.cinemas=cinemas;this.audit=audit;this.checkins=checkins;this.notifications=notifications;this.zone=ZoneId.of(zone);}

    public List<StaffOption> staffOptions(String actorEmail){
        AppUser actor=actor(actorEmail); UUID managerCinema=actor.getRole()==Role.ADMIN?null:actorCinema(actor);
        return profiles.findAllByDeletedAtIsNullOrderByEmployeeCodeAsc().stream().filter(p->p.getCinemaId()!=null&&"ACTIVE".equals(p.getEmploymentStatus())).filter(p->managerCinema==null||managerCinema.equals(p.getCinemaId())).map(p->{AppUser u=users.findById(p.getUserId()).orElseThrow();String cn=cinemas.findById(p.getCinemaId()).map(Cinema::getName).orElse("-");return u.isAccountEnabled()?new StaffOption(u.getId(),p.getEmployeeCode(),u.getFullName(),u.getRole().name(),p.getCinemaId(),cn):null;}).filter(Objects::nonNull).filter(o->actor.getRole()==Role.ADMIN||"STAFF".equals(o.role())).toList();
    }
    public List<CinemaOption> cinemaOptions(String actorEmail){AppUser actor=actor(actorEmail);if(actor.getRole()==Role.ADMIN)return cinemas.findAll().stream().map(c->new CinemaOption(c.getId(),c.getName())).toList();UUID id=actorCinema(actor);return cinemas.findById(id).map(c->List.of(new CinemaOption(c.getId(),c.getName()))).orElse(List.of());}

    public List<ShiftResponse> list(LocalDate from,LocalDate to,String actorEmail){
        var actor=actor(actorEmail); LocalDate f=from==null?LocalDate.now(zone).minusDays(7):from; LocalDate t=to==null?f.plusDays(30):to;
        if(t.isBefore(f)||t.isAfter(f.plusMonths(6)))throw new ApiException(HttpStatus.BAD_REQUEST,"Khoảng ngày không hợp lệ");
        List<StaffShift> list=actor.getRole()==Role.ADMIN?shifts.findByShiftDateBetweenOrderByShiftDateAscStartTimeAsc(f,t):shifts.findByCinemaIdAndShiftDateBetweenOrderByShiftDateAscStartTimeAsc(actorCinema(actor),f,t);
        return list.stream().map(this::dto).toList();
    }

    @Transactional public ShiftResponse create(ShiftRequest req,String actorEmail){
        AppUser actor=actor(actorEmail); StaffProfile target=target(req.staffUserId()); validateManage(actor,target); validateTarget(target); StaffShift s=new StaffShift(); apply(s,req,target,actor); ensureNoOverlap(s,null); shifts.save(s); notifyShift(s,"STAFF_SHIFT_ASSIGNED","Bạn có ca làm mới","Ca làm mới đã được xếp"); audit.record(actorEmail,"SHIFT_CREATE","STAFF_SHIFT",s.getId().toString(),target.getEmployeeCode()+" · "+s.getShiftDate()+" "+s.getStartTime()+"-"+s.getEndTime(),null); return dto(s);
    }

    @Transactional public ShiftResponse update(UUID id,ShiftRequest req,String actorEmail){
        AppUser actor=actor(actorEmail); StaffShift s=shifts.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy ca làm")); if(attendance.findByShiftId(id).isPresent())throw new ApiException(HttpStatus.CONFLICT,"Ca đã chấm công nên không thể sửa"); StaffProfile current=target(s.getStaffUserId()); validateManage(actor,current); StaffProfile target=target(req.staffUserId()); validateManage(actor,target); validateTarget(target); apply(s,req,target,actor); ensureNoOverlap(s,id); shifts.save(s); notifyShift(s,"STAFF_SHIFT_UPDATED","Ca làm đã thay đổi","Thông tin ca làm của bạn vừa được cập nhật"); audit.record(actorEmail,"SHIFT_UPDATE","STAFF_SHIFT",id.toString(),target.getEmployeeCode()+" · "+s.getShiftDate(),null); return dto(s);
    }

    @Transactional public void cancel(UUID id,String actorEmail){
        AppUser actor=actor(actorEmail); StaffShift s=shifts.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy ca làm")); validateManage(actor,target(s.getStaffUserId())); if(attendance.findByShiftId(id).isPresent())throw new ApiException(HttpStatus.CONFLICT,"Ca đã chấm công nên không thể huỷ"); s.setStatus("CANCELLED"); shifts.save(s); notifyShift(s,"STAFF_SHIFT_CANCELLED","Ca làm đã bị huỷ","Ca làm của bạn đã được huỷ"); audit.record(actorEmail,"SHIFT_CANCEL","STAFF_SHIFT",id.toString(),"Huỷ ca "+s.getShiftDate(),null);
    }

    private void apply(StaffShift s,ShiftRequest req,StaffProfile target,AppUser actor){
        if(req.startTime().equals(req.endTime()))throw new ApiException(HttpStatus.BAD_REQUEST,"Giờ bắt đầu và kết thúc không được trùng nhau");
        if(!leaves.approvedOverlap(target.getUserId(),req.shiftDate(),req.shiftDate()).isEmpty())throw new ApiException(HttpStatus.CONFLICT,"Nhân viên đang có nghỉ phép APPROVED trong ngày này");
        s.setStaffUserId(target.getUserId()); s.setCinemaId(Objects.requireNonNull(target.getCinemaId(),"cinema")); s.setShiftDate(req.shiftDate()); s.setStartTime(req.startTime()); s.setEndTime(req.endTime()); s.setStatus("SCHEDULED"); s.setNote(clean(req.note())); s.setAssignedBy(actor.getId());
    }
    private void ensureNoOverlap(StaffShift candidate,UUID ignore){
        var near=shifts.findByStaffUserIdAndShiftDateBetweenOrderByShiftDateAscStartTimeAsc(candidate.getStaffUserId(),candidate.getShiftDate().minusDays(1),candidate.getShiftDate().plusDays(1));
        boolean overlap=near.stream().filter(s->!"CANCELLED".equals(s.getStatus())).filter(s->ignore==null||!s.getId().equals(ignore)).anyMatch(s->StaffShiftTime.overlaps(candidate,s,zone));
        if(overlap)throw new ApiException(HttpStatus.CONFLICT,"Nhân viên đã có ca làm trùng thời gian");
    }
    private AppUser actor(String email){return users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản"));}
    private StaffProfile target(UUID userId){return profiles.findById(userId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy hồ sơ nhân viên"));}
    private UUID actorCinema(AppUser actor){return profiles.findById(actor.getId()).map(StaffProfile::getCinemaId).orElseThrow(()->new ApiException(HttpStatus.FORBIDDEN,"Quản lý chưa được phân rạp"));}
    private void validateManage(AppUser actor,StaffProfile target){
        if(actor.getRole()==Role.ADMIN)return; if(actor.getRole()!=Role.MANAGER)throw new ApiException(HttpStatus.FORBIDDEN,"Chỉ quản lý hoặc admin được xếp ca"); UUID c=actorCinema(actor); if(!Objects.equals(c,target.getCinemaId()))throw new ApiException(HttpStatus.FORBIDDEN,"Bạn chỉ được xếp ca cho nhân viên cùng rạp"); AppUser tu=users.findById(target.getUserId()).orElseThrow(); if(tu.getRole()!=Role.STAFF)throw new ApiException(HttpStatus.FORBIDDEN,"Quản lý chỉ được xếp ca cho tài khoản STAFF");
    }
    private void validateTarget(StaffProfile p){AppUser u=users.findById(p.getUserId()).orElseThrow(); if(!u.isAccountEnabled()||!"ACTIVE".equals(p.getEmploymentStatus()))throw new ApiException(HttpStatus.CONFLICT,"Nhân viên phải đang làm việc và được phép đăng nhập"); if(p.getCinemaId()==null||!cinemas.existsById(p.getCinemaId()))throw new ApiException(HttpStatus.CONFLICT,"Nhân viên chưa được phân rạp hợp lệ");}
    private ShiftResponse dto(StaffShift s){StaffProfile p=target(s.getStaffUserId());AppUser u=users.findById(s.getStaffUserId()).orElseThrow();String cinemaName=cinemas.findById(s.getCinemaId()).map(Cinema::getName).orElse("-");var a=attendance.findByShiftId(s.getId()).orElse(null);return new ShiftResponse(s.getId(),u.getId(),p.getEmployeeCode(),u.getFullName(),s.getCinemaId(),cinemaName,s.getShiftDate(),s.getStartTime(),s.getEndTime(),s.getStatus(),s.getNote(),a==null?null:a.getCheckInAt(),a==null?null:a.getCheckOutAt(),checkins.countByShiftId(s.getId()),a==null?null:a.getLateMinutes(),a==null?null:a.getEarlyLeaveMinutes(),a==null?null:a.getWorkedMinutes(),a==null?null:a.getPunctualityStatus());}
    private void notifyShift(StaffShift s,String type,String title,String prefix){String cinema=cinemas.findById(s.getCinemaId()).map(Cinema::getName).orElse("rạp được phân công");String message=prefix+": "+cinema+" · "+s.getShiftDate()+" · "+s.getStartTime()+"-"+s.getEndTime()+".";notifications.create(s.getStaffUserId(),type,title,message,"/staff/schedule");}
    private String clean(String s){return s==null||s.isBlank()?null:s.trim();}
}
