package com.cinebooking.dr;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static com.cinebooking.dr.DisasterRecoveryDtos.*;

@Service
public class DisasterRecoveryService {
    public static final String STRATEGY_VERSION="V69-BACKUP-DR-5";
    public static final List<String> CRITICAL_CATALOG=List.of(
            "booking","payment","seat_hold","admin_step_up_grant","dr_backup_record","dr_restore_drill");

    private final JdbcTemplate jdbc;
    private final long rpoTargetMinutes;
    private final long rtoTargetMinutes;
    private final long backupRetentionDays;
    private final long drillMaxAgeHours;

    public DisasterRecoveryService(
            JdbcTemplate jdbc,
            @Value("${app.disaster-recovery.rpo-target-minutes:60}") long rpoTargetMinutes,
            @Value("${app.disaster-recovery.rto-target-minutes:15}") long rtoTargetMinutes,
            @Value("${app.disaster-recovery.backup-retention-days:30}") long backupRetentionDays,
            @Value("${app.disaster-recovery.drill-max-age-hours:168}") long drillMaxAgeHours) {
        this.jdbc=jdbc;
        this.rpoTargetMinutes=bound(rpoTargetMinutes,5,10080);
        this.rtoTargetMinutes=bound(rtoTargetMinutes,1,1440);
        this.backupRetentionDays=bound(backupRetentionDays,1,3650);
        this.drillMaxAgeHours=bound(drillMaxAgeHours,1,8760);
    }

    public DisasterRecoverySummary summary(){
        Instant now=Instant.now();
        BackupEvidence backup=latestBackup();
        RestoreDrillEvidence drill=latestSuccessfulDrill();
        Long backupAge=backup==null?null:Math.max(0,Duration.between(backup.createdAt(),now).toMinutes());
        Long drillAge=drill==null?null:Math.max(0,Duration.between(drill.completedAt(),now).toHours());
        boolean backupFresh=backupAge!=null&&backupAge<=rpoTargetMinutes;
        boolean drillFresh=drillAge!=null&&drillAge<=drillMaxAgeHours;
        boolean rtoMet=drill!=null&&drill.restoreDurationSeconds()!=null&&drill.restoreDurationSeconds()<=rtoTargetMinutes*60.0;
        String readiness=backupFresh&&drillFresh&&rtoMet?"READY":(backup!=null||drill!=null?"DEGRADED":"NO_DATA");
        return new DisasterRecoverySummary(
                STRATEGY_VERSION,now,readiness,rpoTargetMinutes,rtoTargetMinutes,backupRetentionDays,drillMaxAgeHours,
                count("select count(*) from dr_backup_record"),
                count("select count(*) from dr_restore_drill where status='SUCCESS'"),
                backupAge,drillAge,backupFresh,drillFresh,rtoMet,true,backup,drill,CRITICAL_CATALOG);
    }

    public List<BackupEvidence> backups(int requestedLimit){
        int limit=Math.max(1,Math.min(100,requestedLimit));
        return jdbc.query("""
                select id,backup_key,storage_name,checksum_sha256,size_bytes,latest_flyway_version,public_table_count,
                       source_commit,strategy_version,created_at,verified_at,retention_until,recorded_at
                  from dr_backup_record order by verified_at desc limit ?
                """,this::mapBackup,limit);
    }

    public List<RestoreDrillEvidence> drills(int requestedLimit){
        int limit=Math.max(1,Math.min(100,requestedLimit));
        return jdbc.query("""
                select id,drill_key,backup_id,status,started_at,completed_at,restore_duration_seconds,rpo_seconds,
                       restored_flyway_version,restored_public_table_count,checksum_verified,critical_catalog_verified,message,recorded_at
                  from dr_restore_drill order by completed_at desc limit ?
                """,this::mapDrill,limit);
    }

    private BackupEvidence latestBackup(){
        List<BackupEvidence> rows=backups(1);
        return rows.isEmpty()?null:rows.getFirst();
    }

    private RestoreDrillEvidence latestSuccessfulDrill(){
        List<RestoreDrillEvidence> rows=jdbc.query("""
                select id,drill_key,backup_id,status,started_at,completed_at,restore_duration_seconds,rpo_seconds,
                       restored_flyway_version,restored_public_table_count,checksum_verified,critical_catalog_verified,message,recorded_at
                  from dr_restore_drill where status='SUCCESS' order by completed_at desc limit 1
                """,this::mapDrill);
        return rows.isEmpty()?null:rows.getFirst();
    }

    private long count(String sql){Long n=jdbc.queryForObject(sql,Long.class);return n==null?0:n;}
    private static long bound(long value,long min,long max){return Math.max(min,Math.min(max,value));}
    private static Instant instant(ResultSet rs,String column)throws SQLException{Timestamp ts=rs.getTimestamp(column);return ts==null?null:ts.toInstant();}

    private BackupEvidence mapBackup(ResultSet rs,int row)throws SQLException{
        return new BackupEvidence(
                rs.getObject("id",UUID.class),rs.getString("backup_key"),rs.getString("storage_name"),rs.getString("checksum_sha256"),
                rs.getLong("size_bytes"),rs.getInt("latest_flyway_version"),rs.getInt("public_table_count"),rs.getString("source_commit"),
                rs.getString("strategy_version"),instant(rs,"created_at"),instant(rs,"verified_at"),instant(rs,"retention_until"),instant(rs,"recorded_at"));
    }

    private RestoreDrillEvidence mapDrill(ResultSet rs,int row)throws SQLException{
        Number duration=(Number)rs.getObject("restore_duration_seconds");
        Number rpo=(Number)rs.getObject("rpo_seconds");
        Number flyway=(Number)rs.getObject("restored_flyway_version");
        Number tables=(Number)rs.getObject("restored_public_table_count");
        return new RestoreDrillEvidence(
                rs.getObject("id",UUID.class),rs.getString("drill_key"),rs.getObject("backup_id",UUID.class),rs.getString("status"),
                instant(rs,"started_at"),instant(rs,"completed_at"),duration==null?null:duration.doubleValue(),rpo==null?null:rpo.longValue(),
                flyway==null?null:flyway.intValue(),tables==null?null:tables.intValue(),rs.getBoolean("checksum_verified"),
                rs.getBoolean("critical_catalog_verified"),rs.getString("message"),instant(rs,"recorded_at"));
    }
}
