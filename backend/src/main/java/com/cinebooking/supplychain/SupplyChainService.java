package com.cinebooking.supplychain;

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

import static com.cinebooking.supplychain.SupplyChainDtos.*;

@Service
public class SupplyChainService {
    public static final String STRATEGY_VERSION="V72-SUPPLY-CHAIN-INTEGRITY-5";
    private static final List<String> ARTIFACT_TYPES=List.of("BACKEND_JAR","FRONTEND_BUNDLE","CONTAINER_IMAGE","DEPENDENCY_INVENTORY");

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final AuditService audit;
    private final int evidenceMaxAgeHours;
    private final int maxCritical;
    private final int maxHigh;
    private final boolean releaseGateEnforcementEnabled;

    public SupplyChainService(
            JdbcTemplate jdbc,
            UserRepository users,
            AuditService audit,
            @Value("${app.supply-chain.evidence-max-age-hours:168}") int evidenceMaxAgeHours,
            @Value("${app.supply-chain.max-critical:0}") int maxCritical,
            @Value("${app.supply-chain.max-high:0}") int maxHigh,
            @Value("${app.supply-chain.release-gate-enforcement-enabled:false}") boolean releaseGateEnforcementEnabled) {
        this.jdbc=jdbc;
        this.users=users;
        this.audit=audit;
        this.evidenceMaxAgeHours=Math.max(1,Math.min(24*90,evidenceMaxAgeHours));
        this.maxCritical=Math.max(0,Math.min(10000,maxCritical));
        this.maxHigh=Math.max(0,Math.min(10000,maxHigh));
        this.releaseGateEnforcementEnabled=releaseGateEnforcementEnabled;
    }

    public SupplyChainSummary summary(){
        List<SoftwareArtifactEvidence> artifacts=artifacts(1);
        List<SoftwareSupplyChainScan> scans=scans(1);
        long artifactCount=count("select count(*) from software_artifact_evidence");
        long scanCount=count("select count(*) from software_supply_chain_scan");
        long failed=count("select count(*) from software_supply_chain_scan where decision='FAIL'");
        long warning=count("select count(*) from software_supply_chain_scan where decision='WARN'");
        SoftwareArtifactEvidence latestArtifact=artifacts.isEmpty()?null:artifacts.getFirst();
        SoftwareSupplyChainScan latestScan=scans.isEmpty()?null:scans.getFirst();
        boolean fresh=latestScan!=null&&latestScan.scannedAt()!=null&&latestScan.scannedAt().isAfter(Instant.now().minusSeconds(evidenceMaxAgeHours*3600L));
        String posture;
        if(latestArtifact==null||latestScan==null) posture="NO_EVIDENCE";
        else if("FAIL".equals(latestScan.decision())) posture="ACTION_REQUIRED";
        else if(!fresh||"WARN".equals(latestScan.decision())) posture="REVIEW";
        else posture="READY";
        return new SupplyChainSummary(
                STRATEGY_VERSION,Instant.now(),evidenceMaxAgeHours,maxCritical,maxHigh,releaseGateEnforcementEnabled,!releaseGateEnforcementEnabled,
                artifactCount,scanCount,failed,warning,fresh,posture,
                List.of("DIGESTS_ONLY","NO_ARTIFACT_BINARY_IN_DATABASE","NO_SCANNER_REPORT_BODY_IN_DATABASE","APPEND_ONLY_EVIDENCE"),
                latestArtifact,latestScan);
    }

    public List<SoftwareArtifactEvidence> artifacts(int requestedLimit){
        int limit=Math.max(1,Math.min(100,requestedLimit));
        return jdbc.query("""
                select a.id,a.artifact_key,a.artifact_type,a.version_label,a.sha256,a.source_commit,a.build_ref,a.sbom_ref,
                       u.email actor_email,a.note,a.artifact_created_at,a.recorded_at
                  from software_artifact_evidence a
                  left join app_user u on u.id=a.actor_user_id
                 order by a.artifact_created_at desc,a.recorded_at desc limit ?
                """,this::mapArtifact,limit);
    }

    public List<SoftwareSupplyChainScan> scans(int requestedLimit){
        int limit=Math.max(1,Math.min(100,requestedLimit));
        return jdbc.query("""
                select s.id,s.scan_key,a.artifact_key,a.artifact_type,s.scanner,s.scanner_version,s.report_fingerprint,
                       s.critical_count,s.high_count,s.medium_count,s.low_count,s.decision,u.email actor_email,s.note,s.scanned_at,s.recorded_at
                  from software_supply_chain_scan s
                  join software_artifact_evidence a on a.id=s.artifact_id
                  left join app_user u on u.id=s.actor_user_id
                 order by s.scanned_at desc,s.recorded_at desc limit ?
                """,this::mapScan,limit);
    }

    @Transactional
    public SoftwareArtifactEvidence recordArtifact(RecordArtifactEvidenceRequest body,String actorEmail,String ip){
        if(body==null) throw new ApiException(HttpStatus.BAD_REQUEST,"Thiếu artifact evidence");
        String artifactType=normalizeArtifactType(body.artifactType());
        String versionLabel=required(body.versionLabel(),80,"versionLabel");
        String sha=required(body.sha256(),64,"sha256").toLowerCase(Locale.ROOT);
        if(!sha.matches("[a-f0-9]{64}")) throw new ApiException(HttpStatus.BAD_REQUEST,"sha256 phải là 64 ký tự hex");
        String sourceCommit=bounded(body.sourceCommit(),64,"sourceCommit");
        if(sourceCommit!=null&&!sourceCommit.matches("[A-Fa-f0-9]{7,64}")) throw new ApiException(HttpStatus.BAD_REQUEST,"sourceCommit chỉ nhận Git hex commit");
        String buildRef=bounded(body.buildRef(),160,"buildRef");
        String sbomRef=bounded(body.sbomRef(),200,"sbomRef");
        String note=bounded(body.note(),1000,"note");
        Instant created=body.artifactCreatedAt()==null?Instant.now():body.artifactCreatedAt();
        rejectFuture(created,"artifactCreatedAt");
        AppUser actor=actor(actorEmail);
        UUID id=UUID.randomUUID();
        String key="ART-"+DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC).format(created)+"-"+id.toString().substring(0,8).toUpperCase(Locale.ROOT);
        jdbc.update("""
                insert into software_artifact_evidence(id,artifact_key,artifact_type,version_label,sha256,source_commit,build_ref,sbom_ref,actor_user_id,note,artifact_created_at,recorded_at)
                values (?,?,?,?,?,?,?,?,?,?,?,?)
                """,id,key,artifactType,versionLabel,sha,sourceCommit,buildRef,sbomRef,actor.getId(),note,Timestamp.from(created),Timestamp.from(Instant.now()));
        audit.record(actorEmail,"SUPPLY_CHAIN_ARTIFACT_RECORDED","SOFTWARE_ARTIFACT",id.toString(),"type="+artifactType+"; version="+versionLabel+"; sha256="+sha,ip);
        return artifactById(id);
    }

    @Transactional
    public SoftwareSupplyChainScan recordScan(RecordSupplyChainScanRequest body,String actorEmail,String ip){
        if(body==null||body.artifactId()==null) throw new ApiException(HttpStatus.BAD_REQUEST,"Thiếu artifactId cho scan evidence");
        String scanner=required(body.scanner(),80,"scanner");
        String scannerVersion=bounded(body.scannerVersion(),80,"scannerVersion");
        String fingerprint=required(body.reportFingerprint(),128,"reportFingerprint");
        if(!fingerprint.matches("[A-Za-z0-9:._-]{8,128}")) throw new ApiException(HttpStatus.BAD_REQUEST,"reportFingerprint chỉ được chứa ký tự an toàn và dài 8-128 ký tự");
        validateCount(body.criticalCount(),"criticalCount");validateCount(body.highCount(),"highCount");validateCount(body.mediumCount(),"mediumCount");validateCount(body.lowCount(),"lowCount");
        String note=bounded(body.note(),1000,"note");
        Instant scanned=body.scannedAt()==null?Instant.now():body.scannedAt();
        rejectFuture(scanned,"scannedAt");
        UUID artifactId=jdbc.query("select id from software_artifact_evidence where id=?",rs->rs.next()?rs.getObject(1,UUID.class):null,body.artifactId());
        if(artifactId==null) throw new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy artifact evidence");
        String decision=body.criticalCount()>maxCritical||body.highCount()>maxHigh?"FAIL":body.mediumCount()>0?"WARN":"PASS";
        AppUser actor=actor(actorEmail);
        UUID id=UUID.randomUUID();
        String key="SCAN-"+DateTimeFormatter.ofPattern("yyyyMMdd").withZone(ZoneOffset.UTC).format(scanned)+"-"+id.toString().substring(0,8).toUpperCase(Locale.ROOT);
        jdbc.update("""
                insert into software_supply_chain_scan(id,scan_key,artifact_id,scanner,scanner_version,report_fingerprint,critical_count,high_count,medium_count,low_count,decision,actor_user_id,note,scanned_at,recorded_at)
                values (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,id,key,artifactId,scanner,scannerVersion,fingerprint,body.criticalCount(),body.highCount(),body.mediumCount(),body.lowCount(),decision,actor.getId(),note,Timestamp.from(scanned),Timestamp.from(Instant.now()));
        audit.record(actorEmail,"SUPPLY_CHAIN_SCAN_RECORDED","SOFTWARE_ARTIFACT",artifactId.toString(),"scanner="+scanner+"; decision="+decision+"; critical="+body.criticalCount()+"; high="+body.highCount(),ip);
        return scanById(id);
    }

    private SoftwareArtifactEvidence mapArtifact(ResultSet rs,int row)throws SQLException{
        return new SoftwareArtifactEvidence(rs.getObject("id",UUID.class),rs.getString("artifact_key"),rs.getString("artifact_type"),rs.getString("version_label"),rs.getString("sha256"),rs.getString("source_commit"),rs.getString("build_ref"),rs.getString("sbom_ref"),rs.getString("actor_email"),rs.getString("note"),instant(rs,"artifact_created_at"),instant(rs,"recorded_at"));
    }
    private SoftwareSupplyChainScan mapScan(ResultSet rs,int row)throws SQLException{
        return new SoftwareSupplyChainScan(rs.getObject("id",UUID.class),rs.getString("scan_key"),rs.getString("artifact_key"),rs.getString("artifact_type"),rs.getString("scanner"),rs.getString("scanner_version"),rs.getString("report_fingerprint"),rs.getInt("critical_count"),rs.getInt("high_count"),rs.getInt("medium_count"),rs.getInt("low_count"),rs.getString("decision"),rs.getString("actor_email"),rs.getString("note"),instant(rs,"scanned_at"),instant(rs,"recorded_at"));
    }
    private SoftwareArtifactEvidence artifactById(UUID id){List<SoftwareArtifactEvidence> rows=jdbc.query("""
            select a.id,a.artifact_key,a.artifact_type,a.version_label,a.sha256,a.source_commit,a.build_ref,a.sbom_ref,u.email actor_email,a.note,a.artifact_created_at,a.recorded_at
              from software_artifact_evidence a left join app_user u on u.id=a.actor_user_id where a.id=?
            """,this::mapArtifact,id);if(rows.isEmpty())throw new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy artifact evidence");return rows.getFirst();}
    private SoftwareSupplyChainScan scanById(UUID id){List<SoftwareSupplyChainScan> rows=jdbc.query("""
            select s.id,s.scan_key,a.artifact_key,a.artifact_type,s.scanner,s.scanner_version,s.report_fingerprint,s.critical_count,s.high_count,s.medium_count,s.low_count,s.decision,u.email actor_email,s.note,s.scanned_at,s.recorded_at
              from software_supply_chain_scan s join software_artifact_evidence a on a.id=s.artifact_id left join app_user u on u.id=s.actor_user_id where s.id=?
            """,this::mapScan,id);if(rows.isEmpty())throw new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy scan evidence");return rows.getFirst();}
    private long count(String sql){Long value=jdbc.queryForObject(sql,Long.class);return value==null?0:value;}
    private AppUser actor(String email){return users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không xác định được Admin"));}
    private String normalizeArtifactType(String value){String v=value==null?"":value.trim().toUpperCase(Locale.ROOT);if(!ARTIFACT_TYPES.contains(v))throw new ApiException(HttpStatus.BAD_REQUEST,"artifactType không hợp lệ");return v;}
    private String required(String value,int max,String field){String v=bounded(value,max,field);if(v==null)throw new ApiException(HttpStatus.BAD_REQUEST,"Thiếu "+field);return v;}
    private String bounded(String value,int max,String field){if(value==null||value.trim().isBlank())return null;String v=value.trim();if(v.length()>max)throw new ApiException(HttpStatus.BAD_REQUEST,field+" vượt quá "+max+" ký tự");return v;}
    private void validateCount(int value,String field){if(value<0||value>1_000_000)throw new ApiException(HttpStatus.BAD_REQUEST,field+" không hợp lệ");}
    private void rejectFuture(Instant instant,String field){if(instant.isAfter(Instant.now().plusSeconds(300)))throw new ApiException(HttpStatus.BAD_REQUEST,field+" không được nằm trong tương lai");}
    private static Instant instant(ResultSet rs,String col)throws SQLException{Timestamp ts=rs.getTimestamp(col);return ts==null?null:ts.toInstant();}
}
