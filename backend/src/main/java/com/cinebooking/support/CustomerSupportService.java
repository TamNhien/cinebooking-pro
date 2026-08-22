package com.cinebooking.support;

import com.cinebooking.audit.AuditService;
import com.cinebooking.booking.BookingRepository;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.*;
import com.cinebooking.notification.NotificationService;
import com.cinebooking.user.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import static com.cinebooking.support.SupportDtos.*;

@Service
public class CustomerSupportService {
    private static final Set<String> CATEGORIES=Set.of("BOOKING","PAYMENT","REFUND","TICKET","CINEMA_EXPERIENCE","STAFF","OTHER");
    private static final Set<String> PRIORITIES=Set.of("LOW","MEDIUM","HIGH","CRITICAL");
    private static final Set<String> STATUSES=Set.of("OPEN","IN_PROGRESS","WAITING_CUSTOMER","RESOLVED","CLOSED");

    private final CustomerSupportCaseRepository cases;
    private final CustomerSupportCaseEventRepository events;
    private final UserRepository users;
    private final BookingRepository bookings;
    private final ShowtimeRepository showtimes;
    private final AuditoriumRepository auditoriums;
    private final CinemaRepository cinemas;
    private final StaffProfileRepository profiles;
    private final NotificationService notifications;
    private final AuditService audit;

    public CustomerSupportService(CustomerSupportCaseRepository cases,CustomerSupportCaseEventRepository events,UserRepository users,BookingRepository bookings,
                                  ShowtimeRepository showtimes,AuditoriumRepository auditoriums,CinemaRepository cinemas,StaffProfileRepository profiles,
                                  NotificationService notifications,AuditService audit){
        this.cases=cases;this.events=events;this.users=users;this.bookings=bookings;this.showtimes=showtimes;this.auditoriums=auditoriums;this.cinemas=cinemas;
        this.profiles=profiles;this.notifications=notifications;this.audit=audit;
    }

    public List<CaseResponse> myCases(String email){AppUser u=user(email);return cases.findTop100ByUserIdOrderByCreatedAtDesc(u.getId()).stream().map(this::dto).toList();}

    @Transactional
    public CaseResponse createCase(CreateCaseRequest req,String email,String ip){
        AppUser actor=user(email);String category=upper(req.category());if(!CATEGORIES.contains(category))throw new ApiException(HttpStatus.BAD_REQUEST,"Loại yêu cầu hỗ trợ không hợp lệ");
        UUID cinemaId=null;
        if(req.bookingId()!=null){Booking b=bookings.findById(req.bookingId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));if(!Objects.equals(b.getUserId(),actor.getId())&&!Objects.equals(b.getPurchaserUserId(),actor.getId()))throw new ApiException(HttpStatus.FORBIDDEN,"Booking không thuộc tài khoản của bạn");cinemaId=cinemaForBooking(b);}
        CustomerSupportCase c=new CustomerSupportCase();c.setCaseNumber(nextCaseNumber());c.setUserId(actor.getId());c.setBookingId(req.bookingId());c.setCinemaId(cinemaId);c.setCategory(category);c.setPriority("MEDIUM");c.setStatus("OPEN");c.setSubject(req.subject().trim());c.setDescription(req.description().trim());c.setSlaDueAt(Instant.now().plus(SupportCaseRules.sla("MEDIUM")));cases.save(c);
        addEvent(c,"CASE_CREATED",null,"OPEN","CUSTOMER",c.getDescription(),actor.getId());
        audit.record(email,"SUPPORT_CASE_CREATE","CUSTOMER_SUPPORT_CASE",c.getId().toString(),c.getCaseNumber()+" · "+category+" · "+c.getSubject(),ip);
        return dto(c);
    }

    public List<CaseEventResponse> customerEvents(UUID id,String email){AppUser u=user(email);CustomerSupportCase c=owned(id,u);return events.findByCaseIdOrderByCreatedAtAsc(id).stream().filter(e->"CUSTOMER".equals(e.getVisibility())).map(this::eventDto).toList();}

    @Transactional
    public CaseResponse customerMessage(UUID id,CustomerMessageRequest req,String email,String ip){
        AppUser u=user(email);CustomerSupportCase c=owned(id,u);if("CLOSED".equals(c.getStatus()))throw new ApiException(HttpStatus.CONFLICT,"Yêu cầu đã đóng; không thể gửi thêm tin nhắn");
        String before=c.getStatus();if("WAITING_CUSTOMER".equals(before)||"RESOLVED".equals(before)){c.setStatus("IN_PROGRESS");c.setResolvedAt(null);c.setResolutionNote(null);c.setSlaDueAt(Instant.now().plus(SupportCaseRules.sla(c.getPriority())));}
        c.setLastCustomerMessageAt(Instant.now());cases.save(c);addEvent(c,"CUSTOMER_MESSAGE",before,c.getStatus(),"CUSTOMER",req.message().trim(),u.getId());
        audit.record(email,"SUPPORT_CUSTOMER_MESSAGE","CUSTOMER_SUPPORT_CASE",c.getId().toString(),c.getCaseNumber(),ip);return dto(c);
    }

    public List<SupportCinema> cinemaOptions(String email){AppUser actor=manager(email);if(actor.getRole()==Role.ADMIN)return cinemas.findAllByOrderByNameAsc().stream().map(c->new SupportCinema(c.getId(),c.getName())).toList();Cinema c=cinema(managerCinema(actor));return List.of(new SupportCinema(c.getId(),c.getName()));}

    public List<SupportStaff> staffOptions(String email,UUID requestedCinema){
        AppUser actor=manager(email);UUID managerCinemaId=actor.getRole()==Role.MANAGER?managerCinema(actor):null;List<SupportStaff> out=new ArrayList<>();
        for(StaffProfile p:profiles.findAllByDeletedAtIsNullOrderByEmployeeCodeAsc()){
            if(!"ACTIVE".equals(p.getEmploymentStatus()))continue;
            if(actor.getRole()==Role.MANAGER&&!Objects.equals(p.getCinemaId(),managerCinemaId))continue;
            AppUser u=users.findById(p.getUserId()).orElse(null);
            if(u==null||!u.isAccountEnabled()||(u.getRole()!=Role.STAFF&&u.getRole()!=Role.MANAGER))continue;
            String cinemaName=p.getCinemaId()==null?"Chưa phân rạp":cinemas.findById(p.getCinemaId()).map(Cinema::getName).orElse("-");
            out.add(new SupportStaff(u.getId(),p.getEmployeeCode(),u.getFullName(),u.getRole().name(),p.getCinemaId(),cinemaName));
        }
        return out;
    }

    public SupportSummary summary(String email,UUID requestedCinema){AppUser actor=manager(email);UUID cinemaId=resolveCinema(actor,requestedCinema);Cinema c=cinema(cinemaId);Set<String> open=SupportCaseRules.openStatuses();Instant now=Instant.now();return new SupportSummary(cinemaId,c.getName(),cases.countByCinemaIdAndStatusIn(cinemaId,open),cases.countByCinemaIdAndStatus(cinemaId,"WAITING_CUSTOMER"),cases.countByCinemaIdAndPriorityAndStatusIn(cinemaId,"CRITICAL",open),cases.countByCinemaIdAndSlaDueAtBeforeAndStatusIn(cinemaId,now,open),now);}

    public List<CaseResponse> adminCases(String email,UUID requestedCinema){AppUser actor=manager(email);if(actor.getRole()==Role.ADMIN&&requestedCinema==null)return cases.findTop200ByOrderByCreatedAtDesc().stream().map(this::dto).toList();UUID cinemaId=resolveCinema(actor,requestedCinema);return cases.findTop200ByCinemaIdOrderByCreatedAtDesc(cinemaId).stream().map(this::dto).toList();}

    public List<CaseEventResponse> adminEvents(UUID id,String email){AppUser actor=manager(email);CustomerSupportCase c=adminCase(id,actor);return events.findByCaseIdOrderByCreatedAtAsc(c.getId()).stream().map(this::eventDto).toList();}

    @Transactional
    public CaseResponse plan(UUID id,CasePlanRequest req,String email,String ip){
        AppUser actor=manager(email);CustomerSupportCase c=adminCase(id,actor);String priority=upper(req.priority());if(!PRIORITIES.contains(priority))throw new ApiException(HttpStatus.BAD_REQUEST,"Mức ưu tiên không hợp lệ");
        if(req.assignedTo()!=null){
            AppUser a=users.findById(req.assignedTo()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy người phụ trách"));
            StaffProfile p=profiles.findById(a.getId()).orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"Người phụ trách chưa có hồ sơ nhân viên"));
            if((a.getRole()!=Role.MANAGER&&a.getRole()!=Role.STAFF)||!a.isAccountEnabled()||!"ACTIVE".equals(p.getEmploymentStatus()))throw new ApiException(HttpStatus.BAD_REQUEST,"Người phụ trách phải là Staff/Manager đang hoạt động");
            if(actor.getRole()==Role.MANAGER&&(c.getCinemaId()==null||!Objects.equals(c.getCinemaId(),p.getCinemaId())))throw new ApiException(HttpStatus.BAD_REQUEST,"Manager chỉ phân công nhân sự thuộc cùng rạp của yêu cầu");
        }
        boolean changed=!Objects.equals(c.getPriority(),priority)||!Objects.equals(c.getAssignedTo(),req.assignedTo());c.setPriority(priority);c.setAssignedTo(req.assignedTo());if(changed&&SupportCaseRules.isOpen(c.getStatus()))c.setSlaDueAt(Instant.now().plus(SupportCaseRules.sla(priority)));cases.save(c);addEvent(c,"CASE_PLANNED",c.getStatus(),c.getStatus(),"INTERNAL","Priority="+priority+"; assignee="+userName(req.assignedTo()),actor.getId());audit.record(email,"SUPPORT_CASE_PLAN","CUSTOMER_SUPPORT_CASE",c.getId().toString(),c.getCaseNumber()+" · "+priority,ip);return dto(c);
    }

    @Transactional
    public CaseResponse staffReply(UUID id,StaffReplyRequest req,String email,String ip){
        AppUser actor=manager(email);CustomerSupportCase c=adminCase(id,actor);if("CLOSED".equals(c.getStatus()))throw new ApiException(HttpStatus.CONFLICT,"Yêu cầu đã đóng");String before=c.getStatus();if("OPEN".equals(before))c.setStatus("IN_PROGRESS");c.setLastStaffMessageAt(Instant.now());cases.save(c);String visibility=req.internal()?"INTERNAL":"CUSTOMER";addEvent(c,req.internal()?"INTERNAL_NOTE":"STAFF_MESSAGE",before,c.getStatus(),visibility,req.message().trim(),actor.getId());audit.record(email,req.internal()?"SUPPORT_INTERNAL_NOTE":"SUPPORT_STAFF_REPLY","CUSTOMER_SUPPORT_CASE",c.getId().toString(),c.getCaseNumber(),ip);if(!req.internal())notifications.create(c.getUserId(),"SUPPORT_REPLY","CineBooking đã phản hồi "+c.getCaseNumber(),req.message().trim(),"/support");return dto(c);
    }

    @Transactional
    public CaseResponse transition(UUID id,CaseTransitionRequest req,String email,String ip){
        AppUser actor=manager(email);CustomerSupportCase c=adminCase(id,actor);String target=upper(req.targetStatus());if(!STATUSES.contains(target))throw new ApiException(HttpStatus.BAD_REQUEST,"Trạng thái hỗ trợ không hợp lệ");String from=c.getStatus();if(!SupportCaseRules.canTransition(from,target))throw new ApiException(HttpStatus.CONFLICT,"Không thể chuyển "+from+" -> "+target);String note=clean(req.note());if(("RESOLVED".equals(target)||"CLOSED".equals(target))&&note==null)throw new ApiException(HttpStatus.BAD_REQUEST,"Cần ghi chú khi giải quyết hoặc đóng yêu cầu");Instant now=Instant.now();c.setStatus(target);if("RESOLVED".equals(target)){c.setResolvedAt(now);c.setResolutionNote(note);}if("CLOSED".equals(target))c.setClosedAt(now);if("IN_PROGRESS".equals(target)&&"RESOLVED".equals(from)){c.setResolvedAt(null);c.setResolutionNote(null);c.setClosedAt(null);c.setSlaDueAt(now.plus(SupportCaseRules.sla(c.getPriority())));}cases.save(c);addEvent(c,"STATUS_CHANGED",from,target,"CUSTOMER",note,actor.getId());audit.record(email,"SUPPORT_CASE_TRANSITION","CUSTOMER_SUPPORT_CASE",c.getId().toString(),from+" -> "+target+(note==null?"":" · "+note),ip);notifications.create(c.getUserId(),"SUPPORT_STATUS","Cập nhật yêu cầu "+c.getCaseNumber(),"Trạng thái mới: "+target+(note==null?"":". "+note),"/support");return dto(c);
    }

    private CustomerSupportCase owned(UUID id,AppUser u){CustomerSupportCase c=caseById(id);if(!Objects.equals(c.getUserId(),u.getId()))throw new ApiException(HttpStatus.FORBIDDEN,"Yêu cầu hỗ trợ không thuộc tài khoản của bạn");return c;}
    private CustomerSupportCase adminCase(UUID id,AppUser actor){CustomerSupportCase c=caseById(id);if(actor.getRole()==Role.MANAGER){UUID allowed=managerCinema(actor);if(c.getCinemaId()==null||!Objects.equals(c.getCinemaId(),allowed))throw new ApiException(HttpStatus.FORBIDDEN,"Manager chỉ xử lý yêu cầu thuộc rạp của mình");}return c;}
    private CustomerSupportCase caseById(UUID id){return cases.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy yêu cầu hỗ trợ"));}
    private AppUser user(String email){return users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản"));}
    private AppUser manager(String email){AppUser u=user(email);if(u.getRole()!=Role.MANAGER&&u.getRole()!=Role.ADMIN)throw new ApiException(HttpStatus.FORBIDDEN,"Chỉ Manager/Admin được truy cập trung tâm hỗ trợ");if(!u.isAccountEnabled())throw new ApiException(HttpStatus.FORBIDDEN,"Tài khoản đã bị khoá");return u;}
    private UUID managerCinema(AppUser actor){StaffProfile p=profiles.findById(actor.getId()).orElseThrow(()->new ApiException(HttpStatus.FORBIDDEN,"Manager chưa có hồ sơ nhân viên"));if(p.getCinemaId()==null)throw new ApiException(HttpStatus.FORBIDDEN,"Manager chưa được phân rạp");return p.getCinemaId();}
    private UUID resolveCinema(AppUser actor,UUID requested){if(actor.getRole()==Role.ADMIN){UUID id=requested!=null?requested:cinemas.findAllByOrderByNameAsc().stream().findFirst().map(Cinema::getId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Chưa có rạp"));cinema(id);return id;}UUID id=managerCinema(actor);if(requested!=null&&!Objects.equals(id,requested))throw new ApiException(HttpStatus.FORBIDDEN,"Manager chỉ xem yêu cầu tại rạp của mình");return id;}
    private UUID cinemaForBooking(Booking b){Showtime s=showtimes.findById(b.getShowtimeId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy suất chiếu của booking"));Auditorium a=auditoriums.findById(s.getAuditoriumId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy phòng chiếu"));return a.getCinemaId();}
    private Cinema cinema(UUID id){return cinemas.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy rạp"));}
    private String nextCaseNumber(){return "CB-"+DateTimeFormatter.ofPattern("yyMMddHHmmss").withZone(ZoneOffset.UTC).format(Instant.now())+"-"+UUID.randomUUID().toString().substring(0,4).toUpperCase(Locale.ROOT);}
    private String upper(String v){return v==null?"":v.trim().toUpperCase(Locale.ROOT);} private String clean(String v){return v==null||v.isBlank()?null:v.trim();}
    private String userName(UUID id){return id==null?null:users.findById(id).map(AppUser::getFullName).orElse("-");}
    private String userRole(UUID id){return id==null?null:users.findById(id).map(x->x.getRole().name()).orElse("-");}
    private void addEvent(CustomerSupportCase c,String type,String from,String to,String visibility,String message,UUID actor){CustomerSupportCaseEvent e=new CustomerSupportCaseEvent();e.setCaseId(c.getId());e.setEventType(type);e.setFromStatus(from);e.setToStatus(to);e.setVisibility(visibility);e.setMessage(clean(message));e.setActorUserId(actor);events.save(e);}
    private CaseResponse dto(CustomerSupportCase c){AppUser u=users.findById(c.getUserId()).orElse(null);String cinemaName=c.getCinemaId()==null?null:cinemas.findById(c.getCinemaId()).map(Cinema::getName).orElse("-");boolean overdue=SupportCaseRules.isOpen(c.getStatus())&&c.getSlaDueAt()!=null&&c.getSlaDueAt().isBefore(Instant.now());return new CaseResponse(c.getId(),c.getCaseNumber(),c.getUserId(),u==null?"-":u.getFullName(),u==null?"-":u.getEmail(),c.getBookingId(),c.getCinemaId(),cinemaName,c.getCategory(),c.getPriority(),c.getStatus(),c.getSubject(),c.getDescription(),c.getAssignedTo(),userName(c.getAssignedTo()),c.getSlaDueAt(),overdue,c.getResolutionNote(),c.getLastCustomerMessageAt(),c.getLastStaffMessageAt(),c.getResolvedAt(),c.getClosedAt(),c.getCreatedAt(),c.getUpdatedAt());}
    private CaseEventResponse eventDto(CustomerSupportCaseEvent e){return new CaseEventResponse(e.getId(),e.getCaseId(),e.getEventType(),e.getFromStatus(),e.getToStatus(),e.getVisibility(),e.getMessage(),e.getActorUserId(),userName(e.getActorUserId()),userRole(e.getActorUserId()),e.getCreatedAt());}
}
