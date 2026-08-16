package com.cinebooking.staffops;

import com.cinebooking.audit.AuditService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.CinemaRepository;
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
public class StaffLeaveService {
    private static final Set<String> TYPES=Set.of("VACATION","SICK","PERSONAL","OTHER");
    private final StaffLeaveRequestRepository leaves; private final StaffShiftRepository shifts; private final StaffProfileRepository profiles; private final UserRepository users; private final CinemaRepository cinemas; private final NotificationService notifications; private final AuditService audit; private final ZoneId zone;
    public StaffLeaveService(StaffLeaveRequestRepository leaves,StaffShiftRepository shifts,StaffProfileRepository profiles,UserRepository users,CinemaRepository cinemas,NotificationService notifications,AuditService audit,@Value("${app.staff.time-zone:Asia/Ho_Chi_Minh}") String zone){this.leaves=leaves;this.shifts=shifts;this.profiles=profiles;this.users=users;this.cinemas=cinemas;this.notifications=notifications;this.audit=audit;this.zone=ZoneId.of(zone);}

    public List<LeaveResponse> mine(String email){AppUser u=staffActor(email);return leaves.findByStaffUserIdOrderByCreatedAtDesc(u.getId()).stream().map(this::dto).toList();}

    @Transactional
    public LeaveResponse create(LeaveCreateRequest req,String email){
        AppUser u=staffActor(email); StaffProfile p=profile(u.getId());
        if(p.getCinemaId()==null)throw new ApiException(HttpStatus.CONFLICT,"Nhân viên chưa được phân rạp");
        validateRange(req.fromDate(),req.toDate()); String type=req.leaveType().trim().toUpperCase(Locale.ROOT); if(!TYPES.contains(type))throw new ApiException(HttpStatus.BAD_REQUEST,"Loại nghỉ phép không hợp lệ");
        if(leaves.existsOverlap(u.getId(),req.fromDate(),req.toDate(),List.of("PENDING","APPROVED")))throw new ApiException(HttpStatus.CONFLICT,"Bạn đã có đơn nghỉ đang chờ hoặc đã duyệt trùng khoảng ngày này");
        StaffLeaveRequest r=new StaffLeaveRequest();r.setStaffUserId(u.getId());r.setCinemaId(p.getCinemaId());r.setFromDate(req.fromDate());r.setToDate(req.toDate());r.setLeaveType(type);r.setReason(req.reason().trim());leaves.save(r);
        audit.record(email,"LEAVE_REQUEST_CREATE","STAFF_LEAVE",r.getId().toString(),req.fromDate()+" -> "+req.toDate()+" · "+type,null);
        return dto(r);
    }

    @Transactional public void cancel(UUID id,String email){AppUser u=staffActor(email);StaffLeaveRequest r=leaves.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy đơn nghỉ"));if(!r.getStaffUserId().equals(u.getId()))throw new ApiException(HttpStatus.FORBIDDEN,"Bạn không thể huỷ đơn của người khác");if(!"PENDING".equals(r.getStatus()))throw new ApiException(HttpStatus.CONFLICT,"Chỉ đơn đang chờ duyệt mới có thể huỷ");r.setStatus("CANCELLED");leaves.save(r);audit.record(email,"LEAVE_REQUEST_CANCEL","STAFF_LEAVE",id.toString(),"Nhân viên huỷ đơn",null);}

    public List<LeaveResponse> adminList(String status,LocalDate from,LocalDate to,String actorEmail){
        AppUser actor=managerActor(actorEmail); String s=(status==null||status.isBlank())?"PENDING":status.trim().toUpperCase(Locale.ROOT);
        List<StaffLeaveRequest> list;
        if(from!=null||to!=null){LocalDate f=from==null?LocalDate.now().minusMonths(1):from;LocalDate t=to==null?f.plusMonths(3):to;UUID c=actor.getRole()==Role.ADMIN?null:actorCinema(actor);if(c==null){list=leaves.findAll().stream().filter(r->!r.getFromDate().isAfter(t)&&!r.getToDate().isBefore(f)).toList();}else list=leaves.findByCinemaIdAndFromDateLessThanEqualAndToDateGreaterThanEqualOrderByFromDateAsc(c,t,f);}
        else if(actor.getRole()==Role.ADMIN)list="ALL".equals(s)?leaves.findAll():leaves.findByStatusOrderByCreatedAtAsc(s);
        else {UUID c=actorCinema(actor);list="ALL".equals(s)?leaves.findByCinemaIdAndFromDateLessThanEqualAndToDateGreaterThanEqualOrderByFromDateAsc(c,LocalDate.now().plusYears(2),LocalDate.now().minusYears(2)):leaves.findByCinemaIdAndStatusOrderByCreatedAtAsc(c,s);}
        if(!"ALL".equals(s))list=list.stream().filter(r->s.equals(r.getStatus())).toList();
        if(actor.getRole()==Role.MANAGER)list=list.stream().filter(r->users.findById(r.getStaffUserId()).map(u->u.getRole()==Role.STAFF).orElse(false)).toList();
        return list.stream().sorted(Comparator.comparing(StaffLeaveRequest::getCreatedAt).reversed()).map(this::dto).toList();
    }

    @Transactional
    public LeaveResponse review(UUID id,LeaveReviewRequest req,String actorEmail){
        AppUser actor=managerActor(actorEmail);StaffLeaveRequest r=leaves.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy đơn nghỉ"));validateManage(actor,r);if(!"PENDING".equals(r.getStatus()))throw new ApiException(HttpStatus.CONFLICT,"Đơn nghỉ đã được xử lý");String decision=req.decision().trim().toUpperCase(Locale.ROOT);if(!Set.of("APPROVED","REJECTED").contains(decision))throw new ApiException(HttpStatus.BAD_REQUEST,"Quyết định phải là APPROVED hoặc REJECTED");
        if("APPROVED".equals(decision)){
            var conflicts=shifts.findByStaffUserIdAndShiftDateBetweenOrderByShiftDateAscStartTimeAsc(r.getStaffUserId(),r.getFromDate(),r.getToDate()).stream().filter(s->"SCHEDULED".equals(s.getStatus())).toList();
            if(!conflicts.isEmpty())throw new ApiException(HttpStatus.CONFLICT,"Nhân viên còn "+conflicts.size()+" ca SCHEDULED trong kỳ nghỉ. Hãy huỷ hoặc điều chỉnh các ca này trước khi duyệt nghỉ.");
        }
        r.setStatus(decision);r.setReviewedBy(actor.getId());r.setReviewedAt(Instant.now());r.setReviewNote(clean(req.note()));leaves.save(r);
        String vn="APPROVED".equals(decision)?"được duyệt":"bị từ chối";notifications.create(r.getStaffUserId(),"STAFF_SHIFT_LEAVE_"+decision,"Kết quả đơn nghỉ phép","Đơn nghỉ "+r.getFromDate()+" đến "+r.getToDate()+" đã "+vn+(r.getReviewNote()==null?"":". Ghi chú: "+r.getReviewNote()),"/staff/schedule");
        audit.record(actorEmail,"LEAVE_REQUEST_"+decision,"STAFF_LEAVE",id.toString(),r.getFromDate()+" -> "+r.getToDate(),null);return dto(r);
    }

    public boolean hasApprovedLeave(UUID staffUserId,LocalDate date){return !leaves.approvedOverlap(staffUserId,date,date).isEmpty();}
    public List<StaffLeaveRequest> approvedOverlap(UUID staffUserId,LocalDate from,LocalDate to){return leaves.approvedOverlap(staffUserId,from,to);}

    private void validateRange(LocalDate from,LocalDate to){if(to.isBefore(from))throw new ApiException(HttpStatus.BAD_REQUEST,"Ngày kết thúc phải từ ngày bắt đầu trở đi");if(to.isAfter(from.plusDays(30)))throw new ApiException(HttpStatus.BAD_REQUEST,"Một đơn nghỉ tối đa 31 ngày");if(from.isBefore(LocalDate.now(zone)))throw new ApiException(HttpStatus.BAD_REQUEST,"Không thể tạo đơn nghỉ cho ngày đã qua");}
    private AppUser staffActor(String email){AppUser u=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản"));if(u.getRole()!=Role.STAFF&&u.getRole()!=Role.MANAGER)throw new ApiException(HttpStatus.FORBIDDEN,"Tài khoản này không phải nhân viên rạp");return u;}
    private AppUser managerActor(String email){AppUser u=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản"));if(u.getRole()!=Role.ADMIN&&u.getRole()!=Role.MANAGER)throw new ApiException(HttpStatus.FORBIDDEN,"Chỉ Manager/Admin được xử lý nghỉ phép");return u;}
    private StaffProfile profile(UUID id){return profiles.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy hồ sơ nhân viên"));}
    private UUID actorCinema(AppUser actor){UUID c=profile(actor.getId()).getCinemaId();if(c==null)throw new ApiException(HttpStatus.FORBIDDEN,"Manager chưa được phân rạp");return c;}
    private void validateManage(AppUser actor,StaffLeaveRequest r){if(actor.getRole()==Role.ADMIN)return;UUID c=actorCinema(actor);if(c==null||!c.equals(r.getCinemaId()))throw new ApiException(HttpStatus.FORBIDDEN,"Manager chỉ được duyệt nghỉ cho nhân viên cùng rạp");AppUser target=users.findById(r.getStaffUserId()).orElseThrow();if(target.getRole()!=Role.STAFF)throw new ApiException(HttpStatus.FORBIDDEN,"Manager chỉ được quản lý đơn nghỉ của STAFF");}
    private LeaveResponse dto(StaffLeaveRequest r){StaffProfile p=profile(r.getStaffUserId());AppUser u=users.findById(r.getStaffUserId()).orElseThrow();String cn=cinemas.findById(r.getCinemaId()).map(Cinema::getName).orElse("-");String reviewer=r.getReviewedBy()==null?null:users.findById(r.getReviewedBy()).map(AppUser::getEmail).orElse(null);return new LeaveResponse(r.getId(),r.getStaffUserId(),p.getEmployeeCode(),u.getFullName(),r.getCinemaId(),cn,r.getFromDate(),r.getToDate(),r.getLeaveType(),r.getReason(),r.getStatus(),reviewer,r.getReviewedAt(),r.getReviewNote(),r.getCreatedAt());}
    private String clean(String s){return s==null||s.isBlank()?null:s.trim();}
}
