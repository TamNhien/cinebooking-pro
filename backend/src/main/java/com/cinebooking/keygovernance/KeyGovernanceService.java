package com.cinebooking.keygovernance;

import com.cinebooking.audit.AuditService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.AppUser;
import com.cinebooking.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
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
import java.util.Map;
import java.util.UUID;

import static com.cinebooking.keygovernance.KeyGovernanceDtos.*;

@Service
public class KeyGovernanceService {
    public static final String STRATEGY_VERSION="V71-SECRETS-KEY-GOVERNANCE-5";
    private static final List<String> EVENT_TYPES=List.of("ROTATED","VERIFIED","REVOKED","INCIDENT");
    private static final Map<String,String> SECRET_PROPERTIES=Map.of(
            "JWT_SIGNING_SECRET","app.jwt.secret",
            "SMTP_APP_PASSWORD","spring.mail.password",
            "VNPAY_HASH_SECRET","app.payment.vnpay.hash-secret",
            "MOMO_SECRET_KEY","app.payment.momo.secret-key",
            "WEB_PUSH_VAPID_PRIVATE_KEY","app.pwa.web-push.vapid-private-key");

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final AuditService audit;
    private final Environment environment;
    private final int warningDays;
    private final boolean autoRotationExecutionEnabled;

    public KeyGovernanceService(
            JdbcTemplate jdbc,
            UserRepository users,
            AuditService audit,
            Environment environment,
            @Value("${app.key-governance.warning-days:14}") int warningDays,
            @Value("${app.key-governance.auto-rotation-execution-enabled:false}") boolean autoRotationExecutionEnabled) {
        this.jdbc=jdbc;
        this.users=users;
        this.audit=audit;
        this.environment=environment;
        this.warningDays=Math.max(1,Math.min(90,warningDays));
        this.autoRotationExecutionEnabled=autoRotationExecutionEnabled;
    }

    public KeyGovernanceSummary summary(){
        List<SecretRotationPolicy> rows=policies();
        long enabled=rows.stream().filter(SecretRotationPolicy::enabled).count();
        long configured=rows.stream().filter(x->x.enabled()&&x.configured()).count();
        long noEvidence=rows.stream().filter(x->"NO_EVIDENCE".equals(x.rotationStatus())).count();
        long dueSoon=rows.stream().filter(x->"DUE_SOON".equals(x.rotationStatus())).count();
        long overdue=rows.stream().filter(x->"OVERDUE".equals(x.rotationStatus())).count();
        boolean effectiveAutoRotation=autoRotationExecutionEnabled&&rows.stream().anyMatch(x->x.enabled()&&x.autoRotationEnabled());
        String posture=overdue>0?"ACTION_REQUIRED":dueSoon>0||noEvidence>0?"REVIEW":"READY";
        List<SecretRotationEvent> events=events(1);
        return new KeyGovernanceSummary(
                STRATEGY_VERSION,Instant.now(),warningDays,effectiveAutoRotation,!effectiveAutoRotation,
                enabled,configured,noEvidence,dueSoon,overdue,posture,
                List.of("NO_SECRET_VALUES_IN_DATABASE","FINGERPRINTS_ONLY","APPEND_ONLY_ROTATION_EVIDENCE"),
                events.isEmpty()?null:events.getFirst());
    }

    public List<SecretRotationPolicy> policies(){
        return jdbc.query("""
                select p.id,p.policy_key,p.secret_name,p.secret_class,p.owner_team,p.rotation_days,p.enabled,
                       p.auto_rotation_enabled,p.required_when,p.note,
                       (select max(e.occurred_at) from secret_rotation_event e where e.policy_id=p.id and e.event_type='ROTATED') last_rotated_at
                  from secret_rotation_policy p
                 order by p.policy_key
                """,this::mapPolicy);
    }

    public List<SecretRotationEvent> events(int requestedLimit){
        int limit=Math.max(1,Math.min(100,requestedLimit));
        return jdbc.query("""
                select e.id,e.event_key,p.policy_key,e.event_type,u.email actor_email,e.provider_ref,e.key_fingerprint,e.note,e.occurred_at,e.recorded_at
                  from secret_rotation_event e
                  join secret_rotation_policy p on p.id=e.policy_id
                  left join app_user u on u.id=e.actor_user_id
                 order by e.occurred_at desc,e.recorded_at desc limit ?
                """,this::mapEvent,limit);
    }

    @Transactional
    public SecretRotationEvent record(RecordSecretRotationEventRequest body,String actorEmail,String ip){
        if(body==null) throw new ApiException(HttpStatus.BAD_REQUEST,"Thiếu rotation evidence");
        String policyKey=normalizePolicyKey(body.policyKey());
        String eventType=normalizeEventType(body.eventType());
        String providerRef=bounded(body.providerRef(),160,"providerRef");
        String fingerprint=bounded(body.keyFingerprint(),128,"keyFingerprint");
        String note=bounded(body.note(),1000,"note");
        if(fingerprint!=null&&!fingerprint.matches("[A-Za-z0-9:._-]{8,128}")) throw new ApiException(HttpStatus.BAD_REQUEST,"keyFingerprint chỉ được chứa ký tự an toàn và dài 8-128 ký tự");
        if(("ROTATED".equals(eventType)||"VERIFIED".equals(eventType))&&(fingerprint==null||fingerprint.isBlank())) throw new ApiException(HttpStatus.BAD_REQUEST,"ROTATED/VERIFIED cần keyFingerprint không chứa secret value");
        UUID policyId=jdbc.query("select id from secret_rotation_policy where policy_key=? and enabled=true",rs->rs.next()?rs.getObject(1,UUID.class):null,policyKey);
        if(policyId==null) throw new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy secret rotation policy đang bật");
        AppUser actor=users.findByEmailIgnoreCase(actorEmail).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không xác định được Admin"));
        Instant occurred=body.occurredAt()==null?Instant.now():body.occurredAt();
        if(occurred.isAfter(Instant.now().plusSeconds(300))) throw new ApiException(HttpStatus.BAD_REQUEST,"occurredAt không được nằm trong tương lai");
        UUID id=UUID.randomUUID();
        String key="KEYEV-"+DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC).format(occurred)+"-"+id.toString().substring(0,8).toUpperCase(Locale.ROOT);
        jdbc.update("""
                insert into secret_rotation_event(id,event_key,policy_id,event_type,actor_user_id,provider_ref,key_fingerprint,note,occurred_at,recorded_at)
                values (?,?,?,?,?,?,?,?,?,?)
                """,id,key,policyId,eventType,actor.getId(),providerRef,fingerprint,note,Timestamp.from(occurred),Timestamp.from(Instant.now()));
        audit.record(actorEmail,"SECRET_ROTATION_EVIDENCE_RECORDED","SECRET_ROTATION_POLICY",policyId.toString(),"policy="+policyKey+"; type="+eventType,ip);
        return eventById(id);
    }

    private SecretRotationPolicy mapPolicy(ResultSet rs,int row)throws SQLException{
        String key=rs.getString("policy_key");
        Instant last=instant(rs,"last_rotated_at");
        int days=rs.getInt("rotation_days");
        Instant next=last==null?null:last.plusSeconds(days*86400L);
        String status;
        if(!rs.getBoolean("enabled")) status="DISABLED";
        else if(last==null) status="NO_EVIDENCE";
        else if(next.isBefore(Instant.now())) status="OVERDUE";
        else if(next.isBefore(Instant.now().plusSeconds(warningDays*86400L))) status="DUE_SOON";
        else status="HEALTHY";
        return new SecretRotationPolicy(
                rs.getObject("id",UUID.class),key,rs.getString("secret_name"),rs.getString("secret_class"),rs.getString("owner_team"),days,
                rs.getBoolean("enabled"),rs.getBoolean("auto_rotation_enabled"),rs.getString("required_when"),rs.getString("note"),configured(key),last,next,status);
    }

    private SecretRotationEvent mapEvent(ResultSet rs,int row)throws SQLException{
        return new SecretRotationEvent(rs.getObject("id",UUID.class),rs.getString("event_key"),rs.getString("policy_key"),rs.getString("event_type"),rs.getString("actor_email"),rs.getString("provider_ref"),rs.getString("key_fingerprint"),rs.getString("note"),instant(rs,"occurred_at"),instant(rs,"recorded_at"));
    }

    private SecretRotationEvent eventById(UUID id){
        List<SecretRotationEvent> rows=jdbc.query("""
                select e.id,e.event_key,p.policy_key,e.event_type,u.email actor_email,e.provider_ref,e.key_fingerprint,e.note,e.occurred_at,e.recorded_at
                  from secret_rotation_event e join secret_rotation_policy p on p.id=e.policy_id left join app_user u on u.id=e.actor_user_id where e.id=?
                """,this::mapEvent,id);
        if(rows.isEmpty()) throw new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy rotation evidence");
        return rows.getFirst();
    }

    private boolean configured(String policyKey){
        String property=SECRET_PROPERTIES.get(policyKey);
        if(property==null) return false;
        String value=environment.getProperty(property);
        return value!=null&&!value.isBlank();
    }
    private String normalizePolicyKey(String value){String v=value==null?"":value.trim().toUpperCase(Locale.ROOT);if(v.isBlank()||!SECRET_PROPERTIES.containsKey(v))throw new ApiException(HttpStatus.BAD_REQUEST,"policyKey không hợp lệ");return v;}
    private String normalizeEventType(String value){String v=value==null?"":value.trim().toUpperCase(Locale.ROOT);if(!EVENT_TYPES.contains(v))throw new ApiException(HttpStatus.BAD_REQUEST,"eventType chỉ nhận ROTATED, VERIFIED, REVOKED hoặc INCIDENT");return v;}
    private String bounded(String value,int max,String field){if(value==null||value.trim().isBlank())return null;String v=value.trim();if(v.length()>max)throw new ApiException(HttpStatus.BAD_REQUEST,field+" vượt quá "+max+" ký tự");return v;}
    private static Instant instant(ResultSet rs,String col)throws SQLException{Timestamp ts=rs.getTimestamp(col);return ts==null?null:ts.toInstant();}
}
