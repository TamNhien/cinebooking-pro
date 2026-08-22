package com.cinebooking.maintenance;

import com.cinebooking.audit.AuditService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.AuditoriumRepository;
import com.cinebooking.movie.CinemaRepository;
import com.cinebooking.staffops.StaffIncidentRepository;
import com.cinebooking.user.StaffProfileRepository;
import com.cinebooking.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import static com.cinebooking.maintenance.MaintenanceDtos.*;

@Service
public class MaintenanceService {
    private static final Set<String> CATEGORIES=Set.of("PROJECTOR","AUDIO","HVAC","SCREEN","POS","NETWORK","POWER","SAFETY","OTHER");
    private static final Set<String> ASSET_STATUSES=Set.of("OPERATIONAL","DEGRADED","OUT_OF_SERVICE","MAINTENANCE");
    private static final Set<String> PRIORITIES=Set.of("LOW","MEDIUM","HIGH","CRITICAL");

    private final CinemaEquipmentAssetRepository assets;
    private final MaintenanceWorkOrderRepository orders;
    private final MaintenanceWorkOrderEventRepository events;
    private final CinemaRepository cinemas;
    private final AuditoriumRepository auditoriums;
    private final StaffIncidentRepository incidents;
    private final UserRepository users;
    private final StaffProfileRepository profiles;
    private final AuditService audit;

    public MaintenanceService(CinemaEquipmentAssetRepository assets,MaintenanceWorkOrderRepository orders,MaintenanceWorkOrderEventRepository events,
                              CinemaRepository cinemas,AuditoriumRepository auditoriums,StaffIncidentRepository incidents,UserRepository users,
                              StaffProfileRepository profiles,AuditService audit){
        this.assets=assets;this.orders=orders;this.events=events;this.cinemas=cinemas;this.auditoriums=auditoriums;this.incidents=incidents;
        this.users=users;this.profiles=profiles;this.audit=audit;
    }

    public List<CinemaOption> cinemaOptions(String email){
        AppUser actor=manager(email);
        if(actor.getRole()==Role.ADMIN)return cinemas.findAllByOrderByNameAsc().stream().map(c->new CinemaOption(c.getId(),c.getName())).toList();
        UUID id=managerCinema(actor);Cinema c=cinema(id);return List.of(new CinemaOption(c.getId(),c.getName()));
    }

    public List<AuditoriumOption> auditoriumOptions(String email,UUID requestedCinema){
        AppUser actor=manager(email);UUID cinemaId=resolveCinema(actor,requestedCinema);
        return auditoriums.findByCinemaIdOrderByNameAsc(cinemaId).stream().map(a->new AuditoriumOption(a.getId(),a.getCinemaId(),a.getName())).toList();
    }

    public List<StaffOption> staffOptions(String email,UUID requestedCinema){
        AppUser actor=manager(email);UUID cinemaId=resolveCinema(actor,requestedCinema);List<StaffOption> out=new ArrayList<>();
        for(StaffProfile p:profiles.findAllByDeletedAtIsNullOrderByEmployeeCodeAsc()){
            if(!Objects.equals(p.getCinemaId(),cinemaId)||!"ACTIVE".equals(p.getEmploymentStatus()))continue;
            AppUser u=users.findById(p.getUserId()).orElse(null);if(u==null||!u.isAccountEnabled()||(u.getRole()!=Role.STAFF&&u.getRole()!=Role.MANAGER))continue;
            out.add(new StaffOption(u.getId(),p.getEmployeeCode(),u.getFullName(),u.getRole().name()));
        }
        return out;
    }

    public List<IncidentOption> incidentOptions(String email,UUID requestedCinema){
        AppUser actor=manager(email);UUID cinemaId=resolveCinema(actor,requestedCinema);
        return incidents.findTop100ByCinemaIdOrderByCreatedAtDesc(cinemaId).stream().filter(x->"OPEN".equals(x.getStatus()))
                .map(x->new IncidentOption(x.getId(),x.getSeverity(),x.getCategory(),x.getTitle(),userName(x.getReportedBy()),x.getCreatedAt())).toList();
    }

    public MaintenanceSummary summary(String email,UUID requestedCinema){
        AppUser actor=manager(email);UUID cinemaId=resolveCinema(actor,requestedCinema);Cinema c=cinema(cinemaId);Instant now=Instant.now();LocalDate today=LocalDate.now();
        Set<String> open=MaintenanceWorkOrderRules.openStatuses();
        return new MaintenanceSummary(cinemaId,c.getName(),assets.findByCinemaIdOrderByAssetCodeAsc(cinemaId).size(),
                assets.countByCinemaIdAndStatus(cinemaId,"DEGRADED"),assets.countByCinemaIdAndStatus(cinemaId,"OUT_OF_SERVICE"),assets.countByCinemaIdAndStatus(cinemaId,"MAINTENANCE"),
                orders.countByCinemaIdAndStatusIn(cinemaId,open),orders.countByCinemaIdAndPriorityAndStatusIn(cinemaId,"CRITICAL",open),orders.countByCinemaIdAndDueAtBeforeAndStatusIn(cinemaId,now,open),
                assets.countByCinemaIdAndNextServiceDueBetween(cinemaId,today,today.plusDays(14)),now);
    }

    public List<AssetResponse> assets(String email,UUID requestedCinema){
        AppUser actor=manager(email);UUID cinemaId=resolveCinema(actor,requestedCinema);return assets.findByCinemaIdOrderByAssetCodeAsc(cinemaId).stream().map(this::assetDto).toList();
    }

    @Transactional
    public AssetResponse createAsset(AssetRequest req,String email,String ip){
        AppUser actor=manager(email);UUID cinemaId=resolveCinema(actor,req.cinemaId());validateAsset(req,cinemaId,null);
        CinemaEquipmentAsset x=new CinemaEquipmentAsset();applyAsset(x,req,cinemaId);assets.save(x);
        audit.record(email,"MAINTENANCE_ASSET_CREATE","CINEMA_EQUIPMENT_ASSET",x.getId().toString(),x.getAssetCode()+" · "+x.getName(),ip);return assetDto(x);
    }

    @Transactional
    public AssetResponse updateAsset(UUID id,AssetRequest req,String email,String ip){
        AppUser actor=manager(email);CinemaEquipmentAsset x=asset(id);resolveCinema(actor,x.getCinemaId());
        if(!Objects.equals(x.getCinemaId(),req.cinemaId()))throw new ApiException(HttpStatus.BAD_REQUEST,"Không thể chuyển thiết bị sang rạp khác; hãy tạo tài sản mới");
        validateAsset(req,x.getCinemaId(),x.getId());applyAsset(x,req,x.getCinemaId());assets.save(x);
        audit.record(email,"MAINTENANCE_ASSET_UPDATE","CINEMA_EQUIPMENT_ASSET",x.getId().toString(),x.getAssetCode()+" · "+x.getStatus(),ip);return assetDto(x);
    }

    public List<WorkOrderResponse> workOrders(String email,UUID requestedCinema){
        AppUser actor=manager(email);UUID cinemaId=resolveCinema(actor,requestedCinema);return orders.findTop200ByCinemaIdOrderByCreatedAtDesc(cinemaId).stream().map(this::workOrderDto).toList();
    }

    @Transactional
    public WorkOrderResponse createWorkOrder(WorkOrderCreateRequest req,String email,String ip){
        AppUser actor=manager(email);UUID cinemaId=resolveCinema(actor,req.cinemaId());String priority=upper(req.priority());
        if(!PRIORITIES.contains(priority))throw new ApiException(HttpStatus.BAD_REQUEST,"Mức ưu tiên không hợp lệ");
        LinkContext links=validateLinks(cinemaId,req.auditoriumId(),req.assetId(),req.sourceIncidentId());validateAssignee(req.assignedTo(),cinemaId);validateDue(req.dueAt());
        MaintenanceWorkOrder x=new MaintenanceWorkOrder();x.setCinemaId(cinemaId);x.setAuditoriumId(links.auditoriumId());x.setAssetId(req.assetId());x.setSourceIncidentId(req.sourceIncidentId());x.setTitle(req.title().trim());x.setDescription(req.description().trim());x.setPriority(priority);x.setAssignedTo(req.assignedTo());x.setDueAt(req.dueAt());x.setCreatedBy(actor.getId());orders.save(x);
        appendEvent(x,"CREATED",null,"OPEN","Tạo work order",actor);audit.record(email,"MAINTENANCE_WORK_ORDER_CREATE","MAINTENANCE_WORK_ORDER",x.getId().toString(),priority+" · "+x.getTitle(),ip);return workOrderDto(x);
    }

    @Transactional
    public WorkOrderResponse planWorkOrder(UUID id,WorkOrderPlanRequest req,String email,String ip){
        AppUser actor=manager(email);MaintenanceWorkOrder x=order(id);resolveCinema(actor,x.getCinemaId());if(!MaintenanceWorkOrderRules.isOpen(x.getStatus()))throw new ApiException(HttpStatus.CONFLICT,"Work order đã đóng, không thể đổi kế hoạch");
        String priority=upper(req.priority());if(!PRIORITIES.contains(priority))throw new ApiException(HttpStatus.BAD_REQUEST,"Mức ưu tiên không hợp lệ");validateAssignee(req.assignedTo(),x.getCinemaId());validateDue(req.dueAt());
        x.setPriority(priority);x.setAssignedTo(req.assignedTo());x.setDueAt(req.dueAt());orders.save(x);appendEvent(x,"PLAN_UPDATED",x.getStatus(),x.getStatus(),clean(req.note()),actor);
        audit.record(email,"MAINTENANCE_WORK_ORDER_PLAN","MAINTENANCE_WORK_ORDER",x.getId().toString(),priority+" · assignee="+req.assignedTo(),ip);return workOrderDto(x);
    }

    @Transactional
    public WorkOrderResponse transition(UUID id,WorkOrderTransitionRequest req,String email,String ip){
        AppUser actor=manager(email);MaintenanceWorkOrder x=order(id);resolveCinema(actor,x.getCinemaId());String target=upper(req.targetStatus());String from=x.getStatus();
        if(!MaintenanceWorkOrderRules.canTransition(from,target))throw new ApiException(HttpStatus.CONFLICT,"Không thể chuyển work order từ "+from+" sang "+target);
        String note=clean(req.note());if(("RESOLVED".equals(target)||"CANCELLED".equals(target)||"BLOCKED".equals(target))&&(note==null||note.length()<3))throw new ApiException(HttpStatus.BAD_REQUEST,"Trạng thái "+target+" cần ghi chú xử lý");
        Instant now=Instant.now();x.setStatus(target);if("IN_PROGRESS".equals(target)&&x.getStartedAt()==null)x.setStartedAt(now);
        if("RESOLVED".equals(target)){x.setResolvedAt(now);x.setResolvedBy(actor.getId());x.setResolutionNote(note);}orders.save(x);appendEvent(x,"STATUS_CHANGED",from,target,note,actor);
        audit.record(email,"MAINTENANCE_WORK_ORDER_STATUS","MAINTENANCE_WORK_ORDER",x.getId().toString(),from+" -> "+target+(note==null?"":" · "+note),ip);return workOrderDto(x);
    }

    public List<WorkOrderEventResponse> events(UUID id,String email){
        AppUser actor=manager(email);MaintenanceWorkOrder x=order(id);resolveCinema(actor,x.getCinemaId());return events.findByWorkOrderIdOrderByCreatedAtAsc(id).stream().map(this::eventDto).toList();
    }

    private void validateAsset(AssetRequest req,UUID cinemaId,UUID currentId){
        String category=upper(req.category()),status=upper(req.status());if(!CATEGORIES.contains(category))throw new ApiException(HttpStatus.BAD_REQUEST,"Nhóm thiết bị không hợp lệ");if(!ASSET_STATUSES.contains(status))throw new ApiException(HttpStatus.BAD_REQUEST,"Trạng thái thiết bị không hợp lệ");
        String code=req.assetCode().trim().toUpperCase(Locale.ROOT);assets.findByAssetCodeIgnoreCase(code).filter(a->currentId==null||!a.getId().equals(currentId)).ifPresent(a->{throw new ApiException(HttpStatus.CONFLICT,"Mã tài sản đã tồn tại");});
        if(req.auditoriumId()!=null)auditoriumInCinema(req.auditoriumId(),cinemaId);if(req.installedOn()!=null&&req.nextServiceDue()!=null&&req.nextServiceDue().isBefore(req.installedOn()))throw new ApiException(HttpStatus.BAD_REQUEST,"Ngày bảo trì kế tiếp không thể trước ngày lắp đặt");
    }
    private void applyAsset(CinemaEquipmentAsset x,AssetRequest req,UUID cinemaId){x.setCinemaId(cinemaId);x.setAuditoriumId(req.auditoriumId());x.setAssetCode(req.assetCode().trim().toUpperCase(Locale.ROOT));x.setName(req.name().trim());x.setCategory(upper(req.category()));x.setStatus(upper(req.status()));x.setVendor(clean(req.vendor()));x.setSerialNumber(clean(req.serialNumber()));x.setInstalledOn(req.installedOn());x.setLastServiceAt(req.lastServiceAt());x.setNextServiceDue(req.nextServiceDue());x.setNote(clean(req.note()));}
    private LinkContext validateLinks(UUID cinemaId,UUID auditoriumId,UUID assetId,UUID incidentId){
        UUID room=auditoriumId;if(room!=null)auditoriumInCinema(room,cinemaId);
        if(assetId!=null){CinemaEquipmentAsset a=asset(assetId);if(!Objects.equals(a.getCinemaId(),cinemaId))throw new ApiException(HttpStatus.BAD_REQUEST,"Thiết bị không thuộc rạp đã chọn");if(a.getAuditoriumId()!=null){if(room!=null&&!room.equals(a.getAuditoriumId()))throw new ApiException(HttpStatus.BAD_REQUEST,"Phòng của work order không khớp phòng gắn với thiết bị");room=a.getAuditoriumId();}}
        if(incidentId!=null){StaffIncident i=incidents.findById(incidentId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy sự cố nguồn"));if(!Objects.equals(i.getCinemaId(),cinemaId))throw new ApiException(HttpStatus.BAD_REQUEST,"Sự cố nguồn không thuộc rạp đã chọn");if(!"OPEN".equals(i.getStatus()))throw new ApiException(HttpStatus.CONFLICT,"Sự cố nguồn đã được đóng");}
        return new LinkContext(room);
    }
    private void validateAssignee(UUID userId,UUID cinemaId){if(userId==null)return;AppUser u=users.findById(userId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy người phụ trách"));if(!u.isAccountEnabled()||(u.getRole()!=Role.STAFF&&u.getRole()!=Role.MANAGER))throw new ApiException(HttpStatus.BAD_REQUEST,"Người phụ trách phải là Staff/Manager đang hoạt động");StaffProfile p=profiles.findById(userId).orElseThrow(()->new ApiException(HttpStatus.BAD_REQUEST,"Người phụ trách chưa có hồ sơ nhân viên"));if(!"ACTIVE".equals(p.getEmploymentStatus())||!Objects.equals(p.getCinemaId(),cinemaId))throw new ApiException(HttpStatus.BAD_REQUEST,"Người phụ trách phải đang làm việc tại đúng rạp");}
    private void validateDue(Instant due){if(due!=null&&due.isAfter(Instant.now().plus(Duration.ofDays(730))))throw new ApiException(HttpStatus.BAD_REQUEST,"Hạn work order không được vượt quá 2 năm");}
    private void appendEvent(MaintenanceWorkOrder x,String type,String from,String to,String note,AppUser actor){MaintenanceWorkOrderEvent e=new MaintenanceWorkOrderEvent();e.setWorkOrderId(x.getId());e.setEventType(type);e.setFromStatus(from);e.setToStatus(to);e.setNote(note);e.setActorUserId(actor.getId());events.save(e);}

    private AppUser manager(String email){AppUser u=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản"));if(u.getRole()!=Role.MANAGER&&u.getRole()!=Role.ADMIN)throw new ApiException(HttpStatus.FORBIDDEN,"Chỉ Manager/Admin được quản lý bảo trì");if(!u.isAccountEnabled())throw new ApiException(HttpStatus.FORBIDDEN,"Tài khoản đã bị khoá");return u;}
    private UUID resolveCinema(AppUser actor,UUID requested){if(actor.getRole()==Role.ADMIN){if(requested!=null){cinema(requested);return requested;}return cinemas.findAllByOrderByNameAsc().stream().findFirst().map(Cinema::getId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Chưa có rạp nào"));}UUID own=managerCinema(actor);if(requested!=null&&!requested.equals(own))throw new ApiException(HttpStatus.FORBIDDEN,"Manager chỉ quản lý bảo trì tại rạp của mình");return own;}
    private UUID managerCinema(AppUser actor){return profiles.findById(actor.getId()).map(StaffProfile::getCinemaId).orElseThrow(()->new ApiException(HttpStatus.FORBIDDEN,"Manager chưa được phân rạp"));}
    private Cinema cinema(UUID id){return cinemas.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy rạp"));}
    private Auditorium auditoriumInCinema(UUID id,UUID cinemaId){Auditorium a=auditoriums.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy phòng chiếu"));if(!Objects.equals(a.getCinemaId(),cinemaId))throw new ApiException(HttpStatus.BAD_REQUEST,"Phòng chiếu không thuộc rạp đã chọn");return a;}
    private CinemaEquipmentAsset asset(UUID id){return assets.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy thiết bị"));}
    private MaintenanceWorkOrder order(UUID id){return orders.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy work order"));}
    private String upper(String v){return v==null?"":v.trim().toUpperCase(Locale.ROOT);} private String clean(String v){return v==null||v.isBlank()?null:v.trim();}
    private String userName(UUID id){return id==null?null:users.findById(id).map(AppUser::getFullName).orElse("-");}
    private String auditoriumName(UUID id){return id==null?null:auditoriums.findById(id).map(Auditorium::getName).orElse("-");}
    private AssetResponse assetDto(CinemaEquipmentAsset x){return new AssetResponse(x.getId(),x.getCinemaId(),cinema(x.getCinemaId()).getName(),x.getAuditoriumId(),auditoriumName(x.getAuditoriumId()),x.getAssetCode(),x.getName(),x.getCategory(),x.getStatus(),x.getVendor(),x.getSerialNumber(),x.getInstalledOn(),x.getLastServiceAt(),x.getNextServiceDue(),x.getNote(),x.getCreatedAt(),x.getUpdatedAt());}
    private WorkOrderResponse workOrderDto(MaintenanceWorkOrder x){CinemaEquipmentAsset a=x.getAssetId()==null?null:assets.findById(x.getAssetId()).orElse(null);boolean overdue=MaintenanceWorkOrderRules.isOpen(x.getStatus())&&x.getDueAt()!=null&&x.getDueAt().isBefore(Instant.now());return new WorkOrderResponse(x.getId(),x.getCinemaId(),cinema(x.getCinemaId()).getName(),x.getAuditoriumId(),auditoriumName(x.getAuditoriumId()),x.getAssetId(),a==null?null:a.getAssetCode(),a==null?null:a.getName(),x.getSourceIncidentId(),x.getTitle(),x.getDescription(),x.getPriority(),x.getStatus(),x.getAssignedTo(),userName(x.getAssignedTo()),x.getDueAt(),overdue,x.getResolutionNote(),x.getCreatedBy(),userName(x.getCreatedBy()),x.getStartedAt(),x.getResolvedAt(),x.getResolvedBy(),userName(x.getResolvedBy()),x.getCreatedAt(),x.getUpdatedAt());}
    private WorkOrderEventResponse eventDto(MaintenanceWorkOrderEvent e){return new WorkOrderEventResponse(e.getId(),e.getWorkOrderId(),e.getEventType(),e.getFromStatus(),e.getToStatus(),e.getNote(),e.getActorUserId(),userName(e.getActorUserId()),e.getCreatedAt());}
    private record LinkContext(UUID auditoriumId){}
}
