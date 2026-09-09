package com.cinebooking.privacy;

import com.cinebooking.audit.AuditService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.AppUser;
import com.cinebooking.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import static com.cinebooking.privacy.PrivacyGovernanceDtos.*;

@Service
public class PrivacyGovernanceService {
    public static final String STRATEGY_VERSION="V70-DATA-GOVERNANCE-PRIVACY-5";
    private static final List<String> REQUEST_TYPES=List.of("EXPORT","ERASURE","RECTIFICATION");
    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final AuditService audit;
    private final int requestSlaHours;
    private final boolean retentionExecutionEnabled;

    public PrivacyGovernanceService(
            JdbcTemplate jdbc,
            UserRepository users,
            AuditService audit,
            @Value("${app.privacy.request-sla-hours:72}") int requestSlaHours,
            @Value("${app.privacy.retention-execution-enabled:false}") boolean retentionExecutionEnabled) {
        this.jdbc=jdbc;
        this.users=users;
        this.audit=audit;
        this.requestSlaHours=Math.max(1,Math.min(720,requestSlaHours));
        this.retentionExecutionEnabled=retentionExecutionEnabled;
    }

    public PrivacyGovernanceSummary summary(){
        long policyCount=count("select count(*) from data_retention_policy");
        long enabledPolicyCount=count("select count(*) from data_retention_policy where enabled=true");
        long open=count("select count(*) from privacy_request where status='OPEN'");
        long approved=count("select count(*) from privacy_request where status='APPROVED'");
        long overdue=count("select count(*) from privacy_request where status in ('OPEN','APPROVED') and due_at < now()");
        long destructivePolicyCount=count("select count(*) from data_retention_policy where enabled=true and destructive_execution_enabled=true");
        boolean effectiveRetentionExecution=retentionExecutionEnabled&&destructivePolicyCount>0;
        List<PrivacyRequest> rows=requests(1);
        return new PrivacyGovernanceSummary(
                STRATEGY_VERSION,Instant.now(),requestSlaHours,effectiveRetentionExecution,!effectiveRetentionExecution,
                policyCount,enabledPolicyCount,open,approved,overdue,rows.isEmpty()?null:rows.getFirst(),
                "V70 tracks policy and request evidence. Automatic destructive retention remains hard-guarded OFF unless both runtime and policy gates are enabled.");
    }

    public List<RetentionPolicy> policies(){
        return jdbc.query("""
                select id,policy_key,data_class,table_name,retention_days,retention_action,enabled,
                       destructive_execution_enabled,note,updated_at
                  from data_retention_policy order by data_class,policy_key
                """,this::mapPolicy);
    }

    public List<PrivacyRequest> requests(int requestedLimit){
        int limit=Math.max(1,Math.min(100,requestedLimit));
        return jdbc.query("""
                select r.id,r.request_key,r.subject_user_id,u.email subject_email,u.full_name subject_name,
                       r.request_type,r.status,req.email requested_by_email,rev.email reviewed_by_email,
                       r.reason,r.review_note,r.due_at,r.created_at,r.reviewed_at,r.completed_at
                  from privacy_request r
                  join app_user u on u.id=r.subject_user_id
                  left join app_user req on req.id=r.requested_by
                  left join app_user rev on rev.id=r.reviewed_by
                 order by r.created_at desc limit ?
                """,this::mapRequest,limit);
    }

    public SubjectInventory subjectInventory(String rawEmail){
        String email=normalizeEmail(rawEmail);
        AppUser user=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy người dùng cần kiểm kê dữ liệu"));
        UUID id=user.getId();
        List<SubjectInventoryItem> items=List.of(
                item("IDENTITY","app_user",1,"PROFILE"),
                item("BOOKING","booking",count("select count(*) from booking where user_id=?",id),"RESTRICTED_HISTORY"),
                item("PAYMENT","payment",count("select count(*) from payment p join booking b on b.id=p.booking_id where b.user_id=?",id),"FINANCIAL_HISTORY"),
                item("SECURITY","auth_session",count("select count(*) from auth_session where user_id=?",id),"EXPIRABLE"),
                item("SECURITY","trusted_device",count("select count(*) from trusted_device where user_id=?",id),"REVOCABLE"),
                item("SECURITY","security_alert",count("select count(*) from security_alert where user_id=?",id),"REVIEW"),
                item("ENGAGEMENT","user_notification",count("select count(*) from user_notification where user_id=?",id),"EXPIRABLE"),
                item("ENGAGEMENT","movie_favorite",count("select count(*) from movie_favorite where user_id=?",id),"ERASABLE"),
                item("ENGAGEMENT","movie_review",count("select count(*) from movie_review where user_id=?",id),"REVIEW"),
                item("DEVICE","pwa_device",count("select count(*) from pwa_device where user_id=?",id),"REVOCABLE"));
        long total=items.stream().mapToLong(SubjectInventoryItem::recordCount).sum();
        return new SubjectInventory(id,user.getEmail(),user.getFullName(),Instant.now(),total,items,false);
    }

    @Transactional
    public PrivacyRequest create(CreatePrivacyRequest body,String actorEmail,String ip){
        if(body==null) throw new ApiException(HttpStatus.BAD_REQUEST,"Thiếu nội dung privacy request");
        String email=normalizeEmail(body.subjectEmail());
        String type=normalizeType(body.requestType());
        String reason=body.reason()==null?"":body.reason().trim();
        if(reason.length()<8||reason.length()>500) throw new ApiException(HttpStatus.BAD_REQUEST,"Lý do phải từ 8 đến 500 ký tự");
        AppUser subject=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy người dùng"));
        AppUser actor=users.findByEmailIgnoreCase(actorEmail).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không xác định được Admin"));
        long active=count("select count(*) from privacy_request where subject_user_id=? and request_type=? and status in ('OPEN','APPROVED')",subject.getId(),type);
        if(active>0) throw new ApiException(HttpStatus.CONFLICT,"Đã có privacy request đang hoạt động cùng loại cho người dùng này");
        UUID id=UUID.randomUUID();
        Instant now=Instant.now();
        String key="PRIV-"+DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC).format(now)+"-"+id.toString().substring(0,8).toUpperCase(Locale.ROOT);
        jdbc.update("""
                insert into privacy_request(id,request_key,subject_user_id,request_type,status,requested_by,reason,due_at,created_at)
                values (?,?,?,?, 'OPEN', ?,?,?,?)
                """,id,key,subject.getId(),type,actor.getId(),reason,Timestamp.from(now.plusSeconds(requestSlaHours*3600L)),Timestamp.from(now));
        audit.record(actorEmail,"PRIVACY_REQUEST_CREATED","PRIVACY_REQUEST",id.toString(),"type="+type+"; subject="+subject.getEmail(),ip);
        return requestById(id);
    }

    @Transactional
    public PrivacyRequest review(UUID id,ReviewPrivacyRequest body,String actorEmail,String ip){
        if(body==null) throw new ApiException(HttpStatus.BAD_REQUEST,"Thiếu quyết định review");
        String decision=body.decision()==null?"":body.decision().trim().toUpperCase(Locale.ROOT);
        if(!List.of("APPROVED","REJECTED","CANCELLED").contains(decision)) throw new ApiException(HttpStatus.BAD_REQUEST,"Decision chỉ nhận APPROVED, REJECTED hoặc CANCELLED");
        String note=body.reviewNote()==null?"":body.reviewNote().trim();
        if(note.length()>1000) throw new ApiException(HttpStatus.BAD_REQUEST,"Review note tối đa 1000 ký tự");
        AppUser actor=users.findByEmailIgnoreCase(actorEmail).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không xác định được Admin"));
        String status=jdbc.query("select status from privacy_request where id=? for update",rs->rs.next()?rs.getString(1):null,id);
        if(status==null) throw new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy privacy request");
        if(!"OPEN".equals(status)) throw new ApiException(HttpStatus.CONFLICT,"Chỉ privacy request OPEN mới được review");
        Instant now=Instant.now();
        jdbc.update("update privacy_request set status=?,reviewed_by=?,review_note=?,reviewed_at=? where id=?",decision,actor.getId(),note.isBlank()?null:note,Timestamp.from(now),id);
        audit.record(actorEmail,"PRIVACY_REQUEST_REVIEWED","PRIVACY_REQUEST",id.toString(),"decision="+decision,ip);
        return requestById(id);
    }

    private PrivacyRequest requestById(UUID id){
        List<PrivacyRequest> rows=jdbc.query("""
                select r.id,r.request_key,r.subject_user_id,u.email subject_email,u.full_name subject_name,
                       r.request_type,r.status,req.email requested_by_email,rev.email reviewed_by_email,
                       r.reason,r.review_note,r.due_at,r.created_at,r.reviewed_at,r.completed_at
                  from privacy_request r join app_user u on u.id=r.subject_user_id
                  left join app_user req on req.id=r.requested_by left join app_user rev on rev.id=r.reviewed_by
                 where r.id=?
                """,this::mapRequest,id);
        if(rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy privacy request");
        return rows.getFirst();
    }

    private RetentionPolicy mapPolicy(ResultSet rs,int row)throws SQLException{
        return new RetentionPolicy(rs.getObject("id",UUID.class),rs.getString("policy_key"),rs.getString("data_class"),rs.getString("table_name"),rs.getInt("retention_days"),rs.getString("retention_action"),rs.getBoolean("enabled"),rs.getBoolean("destructive_execution_enabled"),rs.getString("note"),instant(rs,"updated_at"));
    }
    private PrivacyRequest mapRequest(ResultSet rs,int row)throws SQLException{
        Instant due=instant(rs,"due_at");
        String status=rs.getString("status");
        return new PrivacyRequest(rs.getObject("id",UUID.class),rs.getString("request_key"),rs.getObject("subject_user_id",UUID.class),rs.getString("subject_email"),rs.getString("subject_name"),rs.getString("request_type"),status,rs.getString("requested_by_email"),rs.getString("reviewed_by_email"),rs.getString("reason"),rs.getString("review_note"),due,instant(rs,"created_at"),instant(rs,"reviewed_at"),instant(rs,"completed_at"),due!=null&&List.of("OPEN","APPROVED").contains(status)&&due.isBefore(Instant.now()));
    }
    private SubjectInventoryItem item(String domain,String source,long count,String handling){return new SubjectInventoryItem(domain,source,count,handling);}
    private long count(String sql,Object... args){Long n=jdbc.queryForObject(sql,Long.class,args);return n==null?0:n;}
    private String normalizeEmail(String value){String v=value==null?"":value.trim().toLowerCase(Locale.ROOT);if(v.isBlank()||!v.contains("@"))throw new ApiException(HttpStatus.BAD_REQUEST,"Email người dùng không hợp lệ");return v;}
    private String normalizeType(String value){String v=value==null?"":value.trim().toUpperCase(Locale.ROOT);if(!REQUEST_TYPES.contains(v))throw new ApiException(HttpStatus.BAD_REQUEST,"requestType chỉ nhận EXPORT, ERASURE hoặc RECTIFICATION");return v;}
    private static Instant instant(ResultSet rs,String col)throws SQLException{Timestamp ts=rs.getTimestamp(col);return ts==null?null:ts.toInstant();}
}
