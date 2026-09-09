package com.cinebooking.seat;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static com.cinebooking.seat.SeatOperationsDtos.*;

@Service
public class AdminSeatOperationsService {
    public static final String STRATEGY_VERSION="V66-BOOKING-CONSISTENCY-4";
    private final JdbcTemplate jdbc;
    private final SeatHoldService holds;

    public AdminSeatOperationsService(JdbcTemplate jdbc,SeatHoldService holds){this.jdbc=jdbc;this.holds=holds;}

    @Transactional(readOnly=true)
    public SeatConsistencySummary summary(){
        Instant now=Instant.now();
        Instant dayAgo=now.minus(24,ChronoUnit.HOURS);
        long active=count("SELECT count(*) FROM seat_hold WHERE state='HELD' AND expires_at>?",now);
        long expiring=count("SELECT count(*) FROM seat_hold WHERE state='HELD' AND expires_at>? AND expires_at<=?",now,now.plusSeconds(60));
        long converted=count("SELECT count(*) FROM seat_hold WHERE state='CONVERTED' AND released_at>=?",dayAgo);
        long expired=count("SELECT count(*) FROM seat_hold WHERE state='EXPIRED' AND released_at>=?",dayAgo);
        long released=count("SELECT count(*) FROM seat_hold WHERE state='RELEASED' AND released_at>=?",dayAgo);
        long conflicts=count("SELECT count(*) FROM audit_log WHERE action='SEAT_HOLD_CONFLICT' AND created_at>=?",dayAgo);
        return new SeatConsistencySummary(STRATEGY_VERSION,SeatHoldService.AUTHORITY,holds.redisAvailable(),holds.ttlSeconds(),
                active,expiring,converted,expired,released,conflicts,now,recent(80));
    }

    @Transactional(readOnly=true)
    public List<SeatHoldItem> recent(int limit){
        int safe=Math.max(1,Math.min(limit,100));
        return jdbc.query("""
                SELECT h.id,h.hold_token,h.showtime_id,m.title,
                       concat(s.row_label,s.seat_number),u.email,h.state,
                       h.created_at,h.refreshed_at,h.expires_at,h.released_at,
                       h.converted_booking_id,h.last_event
                FROM seat_hold h
                JOIN seat s ON s.id=h.seat_id
                JOIN showtime st ON st.id=h.showtime_id
                JOIN movie m ON m.id=st.movie_id
                JOIN app_user u ON u.id=h.user_id
                ORDER BY h.created_at DESC
                LIMIT ?
                """,(rs,rowNum)->new SeatHoldItem(
                rs.getObject(1,UUID.class),rs.getObject(2,UUID.class),rs.getObject(3,UUID.class),rs.getString(4),rs.getString(5),rs.getString(6),rs.getString(7),
                instant(rs.getTimestamp(8)),instant(rs.getTimestamp(9)),instant(rs.getTimestamp(10)),instant(rs.getTimestamp(11)),rs.getObject(12,UUID.class),rs.getString(13)),safe);
    }

    @Transactional
    public ReconcileResponse reconcile(){
        SeatHoldService.ReconcileResult r=holds.reconcile();
        return new ReconcileResponse(r.expiredRows(),r.activeRows(),r.mirroredRows(),r.redisAvailable(),SeatHoldService.AUTHORITY);
    }

    /**
     * PgJDBC does not reliably infer a TIMESTAMPTZ SQL type from java.time.Instant when it is passed
     * directly through JdbcTemplate varargs. Hibernate/JPA converts Instant for repository queries,
     * but this service uses raw JdbcTemplate, so normalize Instants to java.sql.Timestamp first.
     */
    private long count(String sql,Object... args){
        Object[] jdbcArgs=Arrays.stream(args).map(this::jdbcArg).toArray();
        Long v=jdbc.queryForObject(sql,Long.class,jdbcArgs);
        return v==null?0:v;
    }
    private Object jdbcArg(Object value){return value instanceof Instant instant?Timestamp.from(instant):value;}
    private Instant instant(Timestamp t){return t==null?null:t.toInstant();}
}
