package com.cinebooking.recommendation;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;

import static com.cinebooking.recommendation.AdminRecommendationDtos.*;

@Service
public class AdminRecommendationService {
    public static final String STRATEGY_VERSION = "V76-RECOMMENDATION-5";
    private static final List<String> EVIDENCE_POLICY = List.of(
            "REAL_OPERATIONAL_DATA_ONLY",
            "NO_SYNTHETIC_MOVIE_DATA",
            "EXPLAINABLE_RECOMMENDATIONS",
            "DETERMINISTIC_DIVERSITY_RERANK",
            "EXPLICIT_FEEDBACK_CONTROLS",
            "ASSISTED_BOOKING_IS_CORRELATION_NOT_CAUSATION",
            "NO_RAW_PERSONAL_DATA_IN_ADMIN_RECOMMENDATION_UI"
    );

    private final JdbcTemplate jdbc;

    public AdminRecommendationService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public RecommendationAdminSummaryV76 summary(int requestedDays) {
        int days = bound(requestedDays, 7, 180);
        Instant end = Instant.now();
        Instant start = end.minusSeconds(days * 86_400L);
        Timestamp cutoff = Timestamp.from(start);

        long activeMovies = scalarLong("select count(*) from movie where active=true");
        long actionableMovies = scalarLong(
                "select count(distinct m.id) from movie m join showtime st on st.movie_id=m.id " +
                        "where m.active=true and st.status='OPEN' and st.start_time>now()"
        );
        long metadataCompleteMovies = scalarLong(
                "select count(*) from movie where active=true and nullif(btrim(genre),'') is not null " +
                        "and nullif(btrim(movie_language),'') is not null and duration_minutes>0"
        );
        long registeredUsers = scalarLong("select count(*) from app_user where role='USER' and account_enabled=true");
        long personalizableUsers = scalarLong(
                "select count(*) from (" +
                        " select user_id from movie_favorite" +
                        " union select user_id from movie_review" +
                        " union select user_id from booking where confirmed_at is not null" +
                        " union select user_id from recommendation_event" +
                        " union select user_id from recommendation_feedback" +
                        ") signals join app_user u on u.id=signals.user_id" +
                        " where u.role='USER' and u.account_enabled=true"
        );

        long events = scalarLong("select count(*) from recommendation_event where created_at>=?", cutoff);
        long clicks = scalarLong("select count(*) from recommendation_event where created_at>=? and event_type='CLICK'", cutoff);
        long views = scalarLong("select count(*) from recommendation_event where created_at>=? and event_type='VIEW'", cutoff);
        long feedback = scalarLong("select count(*) from recommendation_feedback where updated_at>=?", cutoff);
        long more = scalarLong("select count(*) from recommendation_feedback where updated_at>=? and feedback_type='MORE_LIKE_THIS'", cutoff);
        long less = scalarLong("select count(*) from recommendation_feedback where updated_at>=? and feedback_type='LESS_LIKE_THIS'", cutoff);
        long hidden = scalarLong("select count(*) from recommendation_feedback where updated_at>=? and feedback_type='HIDE'", cutoff);

        Assisted assisted = assisted(cutoff);
        RecommendationCoverageV76 coverage = new RecommendationCoverageV76(
                percent(actionableMovies, activeMovies),
                percent(metadataCompleteMovies, activeMovies),
                percent(personalizableUsers, registeredUsers),
                qualityStatus(activeMovies, actionableMovies, metadataCompleteMovies)
        );

        return new RecommendationAdminSummaryV76(
                STRATEGY_VERSION,
                end,
                days,
                start,
                end,
                activeMovies,
                actionableMovies,
                metadataCompleteMovies,
                registeredUsers,
                personalizableUsers,
                events,
                clicks,
                views,
                feedback,
                more,
                less,
                hidden,
                assisted.bookings(),
                assisted.revenue(),
                coverage,
                topMovies(cutoff),
                topSources(cutoff),
                EVIDENCE_POLICY
        );
    }

    private Assisted assisted(Timestamp cutoff) {
        Assisted value = jdbc.queryForObject(
                "with assisted_booking as (" +
                        " select distinct b.id booking_id" +
                        " from booking b join showtime st on st.id=b.showtime_id" +
                        " where b.confirmed_at is not null and b.confirmed_at>=?" +
                        " and exists (select 1 from recommendation_event e" +
                        "   where e.user_id=b.user_id and e.movie_id=st.movie_id" +
                        "   and e.created_at between b.confirmed_at-interval '7 days' and b.confirmed_at)" +
                        "), paid_booking as (" +
                        " select p.booking_id,max(p.amount) amount from payment p" +
                        " where p.status='SUCCESS' group by p.booking_id" +
                        ")" +
                        " select count(ab.booking_id) assisted_bookings,coalesce(sum(pb.amount),0) realized_revenue" +
                        " from assisted_booking ab left join paid_booking pb on pb.booking_id=ab.booking_id",
                (rs, rowNum) -> new Assisted(rs.getLong("assisted_bookings"), money(rs.getBigDecimal("realized_revenue"))),
                cutoff
        );
        return value == null ? new Assisted(0L, BigDecimal.ZERO) : value;
    }

    private List<RecommendationMovieMetricV76> topMovies(Timestamp cutoff) {
        return jdbc.query(
                "with event_metric as (" +
                        " select movie_id,count(*) filter(where event_type='CLICK') clicks," +
                        " count(*) filter(where event_type='VIEW') views" +
                        " from recommendation_event where created_at>=? group by movie_id" +
                        "), feedback_metric as (" +
                        " select movie_id,count(*) feedback from recommendation_feedback where updated_at>=? group by movie_id" +
                        "), assisted_metric as (" +
                        " select st.movie_id,count(distinct b.id) assisted_bookings" +
                        " from booking b join showtime st on st.id=b.showtime_id" +
                        " where b.confirmed_at is not null and b.confirmed_at>=?" +
                        " and exists (select 1 from recommendation_event e where e.user_id=b.user_id and e.movie_id=st.movie_id" +
                        "   and e.created_at between b.confirmed_at-interval '7 days' and b.confirmed_at)" +
                        " group by st.movie_id" +
                        ")" +
                        " select m.id movie_id,m.title,coalesce(e.clicks,0) clicks,coalesce(e.views,0) views," +
                        " coalesce(f.feedback,0) feedback,coalesce(a.assisted_bookings,0) assisted_bookings" +
                        " from movie m left join event_metric e on e.movie_id=m.id" +
                        " left join feedback_metric f on f.movie_id=m.id left join assisted_metric a on a.movie_id=m.id" +
                        " where m.active=true and (coalesce(e.clicks,0)+coalesce(e.views,0)+coalesce(f.feedback,0)+coalesce(a.assisted_bookings,0))>0" +
                        " order by (coalesce(e.clicks,0)*3+coalesce(e.views,0)+coalesce(f.feedback,0)*2+coalesce(a.assisted_bookings,0)*4) desc,m.title limit 12",
                (rs, rowNum) -> new RecommendationMovieMetricV76(
                        rs.getObject("movie_id", java.util.UUID.class),
                        rs.getString("title"),
                        rs.getLong("clicks"),
                        rs.getLong("views"),
                        rs.getLong("feedback"),
                        rs.getLong("assisted_bookings")
                ),
                cutoff, cutoff, cutoff
        );
    }

    private List<RecommendationSourceMetricV76> topSources(Timestamp cutoff) {
        return jdbc.query(
                "select coalesce(nullif(btrim(source),''),'UNKNOWN') source," +
                        " count(*) filter(where event_type='CLICK') clicks," +
                        " count(*) filter(where event_type='VIEW') views,count(*) total_events" +
                        " from recommendation_event where created_at>=?" +
                        " group by coalesce(nullif(btrim(source),''),'UNKNOWN')" +
                        " order by total_events desc,source limit 12",
                (rs, rowNum) -> new RecommendationSourceMetricV76(
                        rs.getString("source"),
                        rs.getLong("clicks"),
                        rs.getLong("views"),
                        rs.getLong("total_events")
                ),
                cutoff
        );
    }

    private String qualityStatus(long activeMovies, long actionableMovies, long metadataCompleteMovies) {
        if (activeMovies == 0) return "NO_ACTIVE_MOVIES";
        double actionable = percent(actionableMovies, activeMovies);
        double metadata = percent(metadataCompleteMovies, activeMovies);
        if (actionable >= 80.0 && metadata >= 90.0) return "HEALTHY";
        if (actionable >= 50.0 && metadata >= 70.0) return "PARTIAL";
        return "ATTENTION";
    }

    private long scalarLong(String sql, Object... args) {
        Long value = jdbc.queryForObject(sql, Long.class, args);
        return value == null ? 0L : value;
    }

    private double percent(long numerator, long denominator) {
        if (denominator <= 0) return 0.0;
        return BigDecimal.valueOf(numerator)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    private int bound(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private record Assisted(long bookings, BigDecimal revenue) {}
}
