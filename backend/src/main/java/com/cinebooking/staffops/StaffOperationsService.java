package com.cinebooking.staffops;

import com.cinebooking.audit.AuditService;
import com.cinebooking.booking.BookingRepository;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.*;
import com.cinebooking.operations.TicketCheckInLogRepository;
import com.cinebooking.user.*;
import com.cinebooking.websocket.StaffOperationsEventPublisher;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import static com.cinebooking.staffops.StaffOpsDtos.*;

@Service
public class StaffOperationsService {
    private static final Set<String> INCIDENT_CATEGORIES=Set.of("CUSTOMER","EQUIPMENT","SAFETY","SECURITY","PAYMENT","OTHER");
    private static final Set<String> INCIDENT_SEVERITIES=Set.of("LOW","MEDIUM","HIGH","CRITICAL");

    private final UserRepository users;
    private final StaffProfileRepository profiles;
    private final StaffAttendanceRepository attendance;
    private final StaffShiftRepository shifts;
    private final StaffShiftHandoverRepository handovers;
    private final StaffIncidentRepository incidents;
    private final TicketCheckInLogRepository checkins;
    private final BookingRepository bookings;
    private final ShowtimeRepository showtimes;
    private final MovieRepository movies;
    private final AuditoriumRepository auditoriums;
    private final CinemaRepository cinemas;
    private final AuditService audit;
    private final StaffOperationsEventPublisher events;
    private final ZoneId zone;

    public StaffOperationsService(UserRepository users,StaffProfileRepository profiles,StaffAttendanceRepository attendance,
                                  StaffShiftRepository shifts,StaffShiftHandoverRepository handovers,StaffIncidentRepository incidents,
                                  TicketCheckInLogRepository checkins,BookingRepository bookings,ShowtimeRepository showtimes,
                                  MovieRepository movies,AuditoriumRepository auditoriums,CinemaRepository cinemas,AuditService audit,
                                  StaffOperationsEventPublisher events,@Value("${app.staff.time-zone:Asia/Ho_Chi_Minh}") String zone){
        this.users=users;this.profiles=profiles;this.attendance=attendance;this.shifts=shifts;this.handovers=handovers;this.incidents=incidents;
        this.checkins=checkins;this.bookings=bookings;this.showtimes=showtimes;this.movies=movies;this.auditoriums=auditoriums;this.cinemas=cinemas;
        this.audit=audit;this.events=events;this.zone=ZoneId.of(zone);
    }

    public List<OperationsCinemaOption> cinemas(String email){
        AppUser u=user(email);
        if(u.getRole()==Role.ADMIN)return cinemas.findAllByOrderByNameAsc().stream().map(c->new OperationsCinemaOption(c.getId(),c.getName())).toList();
        UUID cinemaId=effectiveCinemaForStaff(u,null,false);
        Cinema c=cinemas.findById(cinemaId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy rạp"));
        return List.of(new OperationsCinemaOption(c.getId(),c.getName()));
    }

    public OperationsLiveSnapshot live(String email,UUID requestedCinemaId){
        AppUser u=user(email);UUID cinemaId=resolveCinema(u,requestedCinemaId,false);Cinema cinema=cinema(cinemaId);
        Instant now=Instant.now();Instant today=LocalDate.now(zone).atStartOfDay(zone).toInstant();
        long five=checkins.countByCinemaIdAndCheckedInAtBetween(cinemaId,now.minus(Duration.ofMinutes(5)),now);
        long hour=checkins.countByCinemaIdAndCheckedInAtBetween(cinemaId,now.minus(Duration.ofHours(1)),now);
        long day=checkins.countByCinemaIdAndCheckedInAtBetween(cinemaId,today,now);
        long active=attendance.countByCinemaIdAndCheckOutAtIsNull(cinemaId);
        long open=incidents.countByCinemaIdAndStatus(cinemaId,"OPEN");
        List<LiveCheckIn> recent=checkins.findTop20ByCinemaIdOrderByCheckedInAtDesc(cinemaId).stream().map(this::liveCheckIn).toList();
        return new OperationsLiveSnapshot(cinemaId,cinema.getName(),five,hour,day,active,open,now,recent);
    }

    public List<OperationsStaffOption> staffOptions(String email,UUID requestedCinemaId){
        AppUser u=user(email);UUID cinemaId=resolveCinema(u,requestedCinemaId,false);
        List<OperationsStaffOption> out=new ArrayList<>();
        for(StaffProfile p:profiles.findAllByDeletedAtIsNullOrderByEmployeeCodeAsc()){
            if(!Objects.equals(p.getCinemaId(),cinemaId)||!"ACTIVE".equals(p.getEmploymentStatus()))continue;
            AppUser target=users.findById(p.getUserId()).orElse(null);if(target==null||!target.isAccountEnabled())continue;
            if(target.getRole()!=Role.STAFF&&target.getRole()!=Role.MANAGER)continue;
            out.add(new OperationsStaffOption(target.getId(),p.getEmployeeCode(),target.getFullName(),target.getRole().name()));
        }
        return out;
    }

    public List<HandoverResponse> handovers(String email,UUID requestedCinemaId){
        AppUser u=user(email);UUID cinemaId=resolveCinema(u,requestedCinemaId,false);
        return handovers.findTop50ByCinemaIdOrderByCreatedAtDesc(cinemaId).stream().map(this::handoverDto).toList();
    }

    @Transactional
    public HandoverResponse createHandover(HandoverCreateRequest req,String email,String ip){
        AppUser from=user(email);
        if(from.getRole()==Role.ADMIN)throw new ApiException(HttpStatus.FORBIDDEN,"ADMIN không tạo bàn giao ca thay nhân viên");
        StaffAttendance active=activeAttendance(from);
        if(handovers.existsByFromAttendanceIdAndStatus(active.getId(),"PENDING"))throw new ApiException(HttpStatus.CONFLICT,"Ca hiện tại đã có một bàn giao đang chờ nhận");
        AppUser to=users.findById(req.toStaffUserId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy nhân viên nhận bàn giao"));
        if(to.getId().equals(from.getId()))throw new ApiException(HttpStatus.BAD_REQUEST,"Không thể bàn giao ca cho chính mình");
        if((to.getRole()!=Role.STAFF&&to.getRole()!=Role.MANAGER)||!to.isAccountEnabled())throw new ApiException(HttpStatus.BAD_REQUEST,"Tài khoản nhận bàn giao không phải nhân viên đang hoạt động");
        StaffProfile targetProfile=profiles.findById(to.getId()).orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"Nhân viên nhận chưa có hồ sơ"));
        if(!"ACTIVE".equals(targetProfile.getEmploymentStatus())||!Objects.equals(targetProfile.getCinemaId(),active.getCinemaId()))throw new ApiException(HttpStatus.BAD_REQUEST,"Chỉ có thể bàn giao cho nhân viên đang hoạt động cùng rạp");
        StaffShiftHandover h=new StaffShiftHandover();h.setCinemaId(active.getCinemaId());h.setFromShiftId(active.getShiftId());h.setFromAttendanceId(active.getId());h.setFromStaffUserId(from.getId());h.setToStaffUserId(to.getId());h.setSummary(req.summary().trim());
        handovers.save(h);audit.record(email,"SHIFT_HANDOVER_CREATE","STAFF_SHIFT",active.getShiftId().toString(),"Bàn giao cho "+to.getEmail()+": "+h.getSummary(),ip);events.publish(active.getCinemaId(),"HANDOVER_CREATED");return handoverDto(h);
    }

    @Transactional
    public HandoverResponse acceptHandover(UUID id,String email,String ip){
        AppUser u=user(email);if(u.getRole()==Role.ADMIN)throw new ApiException(HttpStatus.FORBIDDEN,"ADMIN không nhận bàn giao ca thay nhân viên");
        StaffAttendance active=activeAttendance(u);
        StaffShiftHandover h=handovers.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy bàn giao"));
        if(!h.getToStaffUserId().equals(u.getId()))throw new ApiException(HttpStatus.FORBIDDEN,"Bàn giao này không dành cho bạn");
        if(!Objects.equals(h.getCinemaId(),active.getCinemaId()))throw new ApiException(HttpStatus.CONFLICT,"Bạn phải đang chấm công tại đúng rạp để nhận bàn giao");
        if(!"PENDING".equals(h.getStatus()))throw new ApiException(HttpStatus.CONFLICT,"Bàn giao đã được xử lý");
        h.setStatus("ACCEPTED");h.setAcceptedAt(Instant.now());h.setAcceptedBy(u.getId());handovers.save(h);
        audit.record(email,"SHIFT_HANDOVER_ACCEPT","STAFF_SHIFT",h.getFromShiftId().toString(),"Đã nhận bàn giao "+h.getId(),ip);events.publish(h.getCinemaId(),"HANDOVER_ACCEPTED");return handoverDto(h);
    }

    public List<IncidentResponse> incidents(String email,UUID requestedCinemaId){
        AppUser u=user(email);UUID cinemaId=resolveCinema(u,requestedCinemaId,false);
        return incidents.findTop100ByCinemaIdOrderByCreatedAtDesc(cinemaId).stream().map(this::incidentDto).toList();
    }

    @Transactional
    public IncidentResponse createIncident(IncidentCreateRequest req,String email,String ip){
        AppUser u=user(email);String category=upper(req.category());String severity=upper(req.severity());
        if(!INCIDENT_CATEGORIES.contains(category))throw new ApiException(HttpStatus.BAD_REQUEST,"Loại sự cố không hợp lệ");
        if(!INCIDENT_SEVERITIES.contains(severity))throw new ApiException(HttpStatus.BAD_REQUEST,"Mức độ sự cố không hợp lệ");
        StaffAttendance active=null;UUID cinemaId;
        if(u.getRole()==Role.ADMIN){cinemaId=resolveCinema(u,req.cinemaId(),false);}else{active=activeAttendance(u);cinemaId=active.getCinemaId();if(req.cinemaId()!=null&&!Objects.equals(req.cinemaId(),cinemaId))throw new ApiException(HttpStatus.FORBIDDEN,"Không thể báo sự cố cho rạp khác ca đang làm");}
        StaffIncident x=new StaffIncident();x.setCinemaId(cinemaId);if(active!=null){x.setShiftId(active.getShiftId());x.setAttendanceId(active.getId());}x.setReportedBy(u.getId());x.setCategory(category);x.setSeverity(severity);x.setTitle(req.title().trim());x.setDescription(req.description().trim());
        incidents.save(x);audit.record(email,"STAFF_INCIDENT_CREATE","STAFF_INCIDENT",x.getId().toString(),severity+" · "+category+" · "+x.getTitle(),ip);events.publish(cinemaId,"INCIDENT_CREATED");return incidentDto(x);
    }

    @Transactional
    public IncidentResponse resolveIncident(UUID id,IncidentResolveRequest req,String email,String ip){
        AppUser u=user(email);if(u.getRole()!=Role.MANAGER&&u.getRole()!=Role.ADMIN)throw new ApiException(HttpStatus.FORBIDDEN,"Chỉ Manager/Admin được đóng sự cố");
        StaffIncident x=incidents.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy sự cố"));
        if(u.getRole()==Role.MANAGER){UUID allowed=resolveCinema(u,null,false);if(!Objects.equals(allowed,x.getCinemaId()))throw new ApiException(HttpStatus.FORBIDDEN,"Manager chỉ xử lý sự cố tại rạp của mình");}
        if(!"OPEN".equals(x.getStatus()))throw new ApiException(HttpStatus.CONFLICT,"Sự cố đã được đóng");
        x.setStatus("RESOLVED");x.setResolvedBy(u.getId());x.setResolvedAt(Instant.now());x.setResolutionNote(req.resolutionNote().trim());incidents.save(x);
        audit.record(email,"STAFF_INCIDENT_RESOLVE","STAFF_INCIDENT",x.getId().toString(),x.getResolutionNote(),ip);events.publish(x.getCinemaId(),"INCIDENT_RESOLVED");return incidentDto(x);
    }

    private AppUser user(String email){
        AppUser u=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản"));
        if(u.getRole()!=Role.STAFF&&u.getRole()!=Role.MANAGER&&u.getRole()!=Role.ADMIN)throw new ApiException(HttpStatus.FORBIDDEN,"Tài khoản không có quyền vận hành rạp");
        if(!u.isAccountEnabled())throw new ApiException(HttpStatus.FORBIDDEN,"Tài khoản đã bị khoá");return u;
    }
    private UUID resolveCinema(AppUser u,UUID requested,boolean requireActive){
        if(u.getRole()==Role.ADMIN){
            if(requested!=null){cinema(requested);return requested;}
            return cinemas.findAllByOrderByNameAsc().stream().findFirst().map(Cinema::getId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Chưa có rạp nào"));
        }
        return effectiveCinemaForStaff(u,requested,requireActive);
    }
    private UUID effectiveCinemaForStaff(AppUser u,UUID requested,boolean requireActive){
        StaffAttendance active=attendance.findFirstByStaffUserIdAndCheckOutAtIsNullOrderByCheckInAtDesc(u.getId()).orElse(null);
        UUID allowed=active==null?profiles.findById(u.getId()).map(StaffProfile::getCinemaId).orElse(null):active.getCinemaId();
        if(requireActive&&active==null)throw new ApiException(HttpStatus.CONFLICT,"Bạn phải bắt đầu ca trước khi thực hiện thao tác này");
        if(allowed==null)throw new ApiException(HttpStatus.FORBIDDEN,"Nhân viên chưa được phân rạp");
        if(requested!=null&&!Objects.equals(requested,allowed))throw new ApiException(HttpStatus.FORBIDDEN,"Bạn chỉ được xem vận hành tại rạp của mình");
        cinema(allowed);return allowed;
    }
    private StaffAttendance activeAttendance(AppUser u){return attendance.findFirstByStaffUserIdAndCheckOutAtIsNullOrderByCheckInAtDesc(u.getId()).orElseThrow(()->new ApiException(HttpStatus.CONFLICT,"Bạn phải bắt đầu ca trước khi thực hiện thao tác này"));}
    private Cinema cinema(UUID id){return cinemas.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy rạp"));}
    private String upper(String v){return v==null?"":v.trim().toUpperCase(Locale.ROOT);}
    private String userName(UUID id){return id==null?null:users.findById(id).map(AppUser::getFullName).orElse("-");}
    private HandoverResponse handoverDto(StaffShiftHandover h){return new HandoverResponse(h.getId(),h.getCinemaId(),cinema(h.getCinemaId()).getName(),h.getFromShiftId(),h.getFromAttendanceId(),h.getFromStaffUserId(),userName(h.getFromStaffUserId()),h.getToStaffUserId(),userName(h.getToStaffUserId()),h.getSummary(),h.getStatus(),h.getCreatedAt(),h.getAcceptedAt());}
    private IncidentResponse incidentDto(StaffIncident x){return new IncidentResponse(x.getId(),x.getCinemaId(),cinema(x.getCinemaId()).getName(),x.getShiftId(),x.getAttendanceId(),x.getReportedBy(),userName(x.getReportedBy()),x.getCategory(),x.getSeverity(),x.getTitle(),x.getDescription(),x.getStatus(),x.getResolvedBy(),userName(x.getResolvedBy()),x.getResolvedAt(),x.getResolutionNote(),x.getCreatedAt(),x.getUpdatedAt());}
    private LiveCheckIn liveCheckIn(TicketCheckInLog log){
        Booking b=bookings.findById(log.getBookingId()).orElse(null);if(b==null)return new LiveCheckIn(log.getBookingId(),"-",cinema(log.getCinemaId()).getName(),"-",log.getCheckedInAt(),log.getSource(),userName(log.getStaffUserId()));
        Showtime st=showtimes.findById(b.getShowtimeId()).orElse(null);if(st==null)return new LiveCheckIn(log.getBookingId(),"-",cinema(log.getCinemaId()).getName(),"-",log.getCheckedInAt(),log.getSource(),userName(log.getStaffUserId()));
        Movie m=movies.findById(st.getMovieId()).orElse(null);Auditorium a=auditoriums.findById(st.getAuditoriumId()).orElse(null);
        return new LiveCheckIn(log.getBookingId(),m==null?"-":m.getTitle(),cinema(log.getCinemaId()).getName(),a==null?"-":a.getName(),log.getCheckedInAt(),log.getSource(),userName(log.getStaffUserId()));
    }
}
