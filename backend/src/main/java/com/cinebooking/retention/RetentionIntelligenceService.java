package com.cinebooking.retention;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.AppUser;
import com.cinebooking.domain.Cinema;
import com.cinebooking.domain.Role;
import com.cinebooking.domain.StaffProfile;
import com.cinebooking.movie.CinemaRepository;
import com.cinebooking.user.StaffProfileRepository;
import com.cinebooking.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import static com.cinebooking.retention.RetentionIntelligenceDtos.*;

@Service
public class RetentionIntelligenceService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final List<Integer> ALLOWED_PERIOD_DAYS = List.of(30, 90);

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final StaffProfileRepository staffProfiles;
    private final CinemaRepository cinemas;

    public RetentionIntelligenceService(
            JdbcTemplate jdbc,
            UserRepository users,
            StaffProfileRepository staffProfiles,
            CinemaRepository cinemas
    ) {
        this.jdbc = jdbc;
        this.users = users;
        this.staffProfiles = staffProfiles;
        this.cinemas = cinemas;
    }

    public List<CinemaOption> cinemaOptions(String email) {
        AppUser actor = operator(email);
        if (actor.getRole() == Role.ADMIN) {
            return cinemas.findAllByOrderByNameAsc().stream()
                    .map(c -> new CinemaOption(c.getId(), c.getName()))
                    .toList();
        }
        UUID cinemaId = managerCinema(actor);
        Cinema cinema = cinema(cinemaId);
        return List.of(new CinemaOption(cinema.getId(), cinema.getName()));
    }

    public RetentionScorecard scorecard(String email, UUID requestedCinemaId, int periodDays) {
        AppUser actor = operator(email);
        UUID cinemaId = resolveCinema(actor, requestedCinemaId);
        validatePeriod(periodDays);

        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        LocalDate from = today.minusDays(periodDays - 1L);
        LocalDate toExclusive = today.plusDays(1);

        SummaryRaw summary = summary(from, toExclusive, cinemaId);
        Map<LocalDate, DailyVolumeRaw> volumeByDay = dailyVolumes(from, toExclusive, cinemaId);
        Map<LocalDate, BigDecimal> revenueByDay = dailyRevenue(from, toExclusive, cinemaId);
        List<DailyRetention> daily = new ArrayList<>();
        BigDecimal revenue = BigDecimal.ZERO;
        for (LocalDate day = from; day.isBefore(toExclusive); day = day.plusDays(1)) {
            DailyVolumeRaw volume = volumeByDay.getOrDefault(day, new DailyVolumeRaw(day, 0, 0, 0));
            BigDecimal dayRevenue = revenueByDay.getOrDefault(day, BigDecimal.ZERO.setScale(2));
            revenue = revenue.add(dayRevenue);
            daily.add(new DailyRetention(day, volume.newCustomers(), volume.returningCustomers(), volume.bookings(), dayRevenue));
        }

        String cinemaName = cinemaId == null ? "Toàn hệ thống" : cinema(cinemaId).getName();
        return new RetentionScorecard(
                cinemaId,
                cinemaName,
                cinemaId == null ? "ALL_CINEMAS" : "CINEMA",
                periodDays,
                from,
                today,
                Instant.now(),
                summary.activeCustomers(),
                summary.newCustomers(),
                summary.returningCustomers(),
                summary.repeatCustomers(),
                percentage(summary.repeatCustomers(), summary.activeCustomers()),
                summary.bookings(),
                averageCount(summary.bookings(), summary.activeCustomers()),
                money(revenue),
                averageMoney(revenue, summary.activeCustomers()),
                lifecycle(today, cinemaId),
                cohorts(today, cinemaId),
                List.copyOf(daily)
        );
    }

    private SummaryRaw summary(LocalDate from, LocalDate toExclusive, UUID cinemaId) {
        String scopeFilter = cinemaId == null ? "" : " and a.cinema_id=?";
        String sql = """
                with confirmed as (
                  select b.id,b.purchaser_user_id customer_id,
                         date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh') booking_date
                  from booking b
                  join app_user u on u.id=b.purchaser_user_id and u.role='USER'
                  join showtime st on st.id=b.showtime_id
                  join auditorium a on a.id=st.auditorium_id
                  where b.status='CONFIRMED' and b.confirmed_at is not null
                """ + scopeFilter + """
                ), history as (
                  select customer_id,min(booking_date) first_date,count(*) lifetime_bookings
                  from confirmed group by customer_id
                ), period as (
                  select customer_id,count(*) period_bookings
                  from confirmed where booking_date>=? and booking_date<?
                  group by customer_id
                )
                select count(*) active_customers,
                       count(*) filter(where h.first_date>=?) new_customers,
                       count(*) filter(where h.first_date<?) returning_customers,
                       count(*) filter(where h.lifetime_bookings>=2) repeat_customers,
                       coalesce(sum(p.period_bookings),0) bookings
                from period p join history h on h.customer_id=p.customer_id
                """;
        List<Object> args = new ArrayList<>();
        if (cinemaId != null) args.add(cinemaId);
        args.add(Date.valueOf(from));
        args.add(Date.valueOf(toExclusive));
        args.add(Date.valueOf(from));
        args.add(Date.valueOf(from));
        return jdbc.query(sql, (rs, rowNum) -> new SummaryRaw(
                rs.getLong("active_customers"),
                rs.getLong("new_customers"),
                rs.getLong("returning_customers"),
                rs.getLong("repeat_customers"),
                rs.getLong("bookings")
        ), args.toArray()).stream().findFirst().orElse(new SummaryRaw(0, 0, 0, 0, 0));
    }

    private Map<LocalDate, DailyVolumeRaw> dailyVolumes(LocalDate from, LocalDate toExclusive, UUID cinemaId) {
        String scopeFilter = cinemaId == null ? "" : " and a.cinema_id=?";
        String sql = """
                with confirmed as (
                  select b.id,b.purchaser_user_id customer_id,
                         date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh') booking_date
                  from booking b
                  join app_user u on u.id=b.purchaser_user_id and u.role='USER'
                  join showtime st on st.id=b.showtime_id
                  join auditorium a on a.id=st.auditorium_id
                  where b.status='CONFIRMED' and b.confirmed_at is not null
                """ + scopeFilter + """
                ), first_dates as (
                  select customer_id,min(booking_date) first_date from confirmed group by customer_id
                )
                select c.booking_date as metric_date,
                       count(distinct c.customer_id) filter(where f.first_date=c.booking_date) new_customers,
                       count(distinct c.customer_id) filter(where f.first_date<c.booking_date) returning_customers,
                       count(*) bookings
                from confirmed c join first_dates f on f.customer_id=c.customer_id
                where c.booking_date>=? and c.booking_date<?
                group by c.booking_date order by c.booking_date
                """;
        List<Object> args = new ArrayList<>();
        if (cinemaId != null) args.add(cinemaId);
        args.add(Date.valueOf(from));
        args.add(Date.valueOf(toExclusive));
        List<DailyVolumeRaw> rows = jdbc.query(sql, (rs, rowNum) -> new DailyVolumeRaw(
                rs.getObject("metric_date", LocalDate.class),
                rs.getLong("new_customers"),
                rs.getLong("returning_customers"),
                rs.getLong("bookings")
        ), args.toArray());
        Map<LocalDate, DailyVolumeRaw> result = new HashMap<>();
        rows.forEach(row -> result.put(row.day(), row));
        return result;
    }

    private Map<LocalDate, BigDecimal> dailyRevenue(LocalDate from, LocalDate toExclusive, UUID cinemaId) {
        String scopeFilter = cinemaId == null ? "" : " and a.cinema_id=?";
        String sql = """
                select date(p.paid_at at time zone 'Asia/Ho_Chi_Minh') as metric_date,
                       coalesce(sum(p.amount),0) revenue
                from payment p
                join booking b on b.id=p.booking_id
                join app_user u on u.id=b.purchaser_user_id and u.role='USER'
                join showtime st on st.id=b.showtime_id
                join auditorium a on a.id=st.auditorium_id
                where p.status='SUCCESS' and p.paid_at is not null
                  and date(p.paid_at at time zone 'Asia/Ho_Chi_Minh')>=?
                  and date(p.paid_at at time zone 'Asia/Ho_Chi_Minh')<?
                """ + scopeFilter + " group by 1 order by 1";
        List<Object> args = new ArrayList<>(List.of(Date.valueOf(from), Date.valueOf(toExclusive)));
        if (cinemaId != null) args.add(cinemaId);
        List<RevenuePoint> rows = jdbc.query(sql, (rs, rowNum) -> new RevenuePoint(
                rs.getObject("metric_date", LocalDate.class),
                money(rs.getBigDecimal("revenue"))
        ), args.toArray());
        Map<LocalDate, BigDecimal> result = new HashMap<>();
        rows.forEach(row -> result.put(row.day(), row.revenue()));
        return result;
    }

    private List<LifecycleSegment> lifecycle(LocalDate today, UUID cinemaId) {
        LocalDate activeCutoff = today.minusDays(29);
        LocalDate riskCutoff = today.minusDays(59);
        LocalDate dormantCutoff = today.minusDays(179);
        String scopeFilter = cinemaId == null ? "" : " and a.cinema_id=?";
        String sql = """
                with confirmed as (
                  select b.purchaser_user_id customer_id,
                         date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh') booking_date
                  from booking b
                  join app_user u on u.id=b.purchaser_user_id and u.role='USER'
                  join showtime st on st.id=b.showtime_id
                  join auditorium a on a.id=st.auditorium_id
                  where b.status='CONFIRMED' and b.confirmed_at is not null
                """ + scopeFilter + """
                ), history as (
                  select customer_id,min(booking_date) first_date,max(booking_date) last_date,count(*) lifetime_bookings
                  from confirmed group by customer_id
                )
                select count(*) filter(where first_date>=?) new_30d,
                       count(*) filter(where first_date<? and last_date>=?) active_repeat,
                       count(*) filter(where last_date>=? and last_date<?) at_risk,
                       count(*) filter(where last_date>=? and last_date<?) dormant,
                       count(*) filter(where last_date<?) lapsed
                from history
                """;
        List<Object> args = new ArrayList<>();
        if (cinemaId != null) args.add(cinemaId);
        args.add(Date.valueOf(activeCutoff));
        args.add(Date.valueOf(activeCutoff));
        args.add(Date.valueOf(activeCutoff));
        args.add(Date.valueOf(riskCutoff));
        args.add(Date.valueOf(activeCutoff));
        args.add(Date.valueOf(dormantCutoff));
        args.add(Date.valueOf(riskCutoff));
        args.add(Date.valueOf(dormantCutoff));
        LifecycleRaw row = jdbc.query(sql, (rs, rowNum) -> new LifecycleRaw(
                rs.getLong("new_30d"),
                rs.getLong("active_repeat"),
                rs.getLong("at_risk"),
                rs.getLong("dormant"),
                rs.getLong("lapsed")
        ), args.toArray()).stream().findFirst().orElse(new LifecycleRaw(0, 0, 0, 0, 0));
        return List.of(
                new LifecycleSegment("NEW_30D", "Khách mới 30 ngày", "Lần mua CONFIRMED đầu tiên trong 30 ngày gần nhất", row.new30d()),
                new LifecycleSegment("ACTIVE_REPEAT", "Khách quay lại đang hoạt động", "Đã mua trước 30 ngày và vẫn có mua CONFIRMED trong 30 ngày gần nhất", row.activeRepeat()),
                new LifecycleSegment("AT_RISK", "Có nguy cơ rời bỏ", "Lần mua CONFIRMED gần nhất cách 30-59 ngày", row.atRisk()),
                new LifecycleSegment("DORMANT", "Ngủ đông", "Lần mua CONFIRMED gần nhất cách 60-179 ngày", row.dormant()),
                new LifecycleSegment("LAPSED", "Đã rời bỏ", "Không có mua CONFIRMED trong ít nhất 180 ngày", row.lapsed())
        );
    }

    private List<CohortRetention> cohorts(LocalDate today, UUID cinemaId) {
        LocalDate eligibleThrough = today.minusDays(30);
        LocalDate cohortFrom = eligibleThrough.withDayOfMonth(1).minusMonths(5);
        LocalDate cohortToExclusive = eligibleThrough.plusDays(1);
        String scopeFilter = cinemaId == null ? "" : " and a.cinema_id=?";
        String sql = """
                with confirmed as (
                  select b.purchaser_user_id customer_id,
                         date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh') booking_date
                  from booking b
                  join app_user u on u.id=b.purchaser_user_id and u.role='USER'
                  join showtime st on st.id=b.showtime_id
                  join auditorium a on a.id=st.auditorium_id
                  where b.status='CONFIRMED' and b.confirmed_at is not null
                """ + scopeFilter + """
                ), history as (
                  select customer_id,min(booking_date) first_date from confirmed group by customer_id
                )
                select date_trunc('month',h.first_date)::date as cohort_month,
                       count(*) acquired_customers,
                       count(*) filter(where exists(
                         select 1 from confirmed c2
                         where c2.customer_id=h.customer_id
                           and c2.booking_date>h.first_date
                           and c2.booking_date<=h.first_date+30
                       )) returned_30d
                from history h
                where h.first_date>=? and h.first_date<?
                group by 1 order by 1
                """;
        List<Object> args = new ArrayList<>();
        if (cinemaId != null) args.add(cinemaId);
        args.add(Date.valueOf(cohortFrom));
        args.add(Date.valueOf(cohortToExclusive));
        return jdbc.query(sql, (rs, rowNum) -> {
            long acquired = rs.getLong("acquired_customers");
            long returned = rs.getLong("returned_30d");
            return new CohortRetention(
                    rs.getObject("cohort_month", LocalDate.class),
                    acquired,
                    returned,
                    percentage(returned, acquired)
            );
        }, args.toArray());
    }

    private AppUser operator(String email) {
        AppUser actor = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Không tìm thấy tài khoản vận hành"));
        if (actor.getRole() != Role.ADMIN && actor.getRole() != Role.MANAGER) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Chỉ Manager/Admin được xem Customer Retention Intelligence");
        }
        return actor;
    }

    private UUID resolveCinema(AppUser actor, UUID requestedCinemaId) {
        if (actor.getRole() == Role.ADMIN) {
            if (requestedCinemaId != null) cinema(requestedCinemaId);
            return requestedCinemaId;
        }
        UUID ownCinema = managerCinema(actor);
        if (requestedCinemaId != null && !Objects.equals(ownCinema, requestedCinemaId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Manager chỉ xem Customer Retention Intelligence của rạp mình");
        }
        return ownCinema;
    }

    private UUID managerCinema(AppUser actor) {
        StaffProfile profile = staffProfiles.findById(actor.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "Manager chưa có hồ sơ nhân viên"));
        if (profile.getCinemaId() == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Manager chưa được gán rạp");
        }
        return profile.getCinemaId();
    }

    private Cinema cinema(UUID id) {
        return cinemas.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy rạp"));
    }

    private void validatePeriod(int periodDays) {
        if (!ALLOWED_PERIOD_DAYS.contains(periodDays)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Customer Retention chỉ hỗ trợ cửa sổ 30 hoặc 90 ngày");
        }
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal averageMoney(BigDecimal value, long count) {
        if (count <= 0) return BigDecimal.ZERO.setScale(2);
        return money(value).divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
    }

    private double averageCount(long value, long count) {
        if (count <= 0) return 0.0;
        return BigDecimal.valueOf(value).divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP).doubleValue();
    }

    private double percentage(long numerator, long denominator) {
        if (denominator <= 0) return 0.0;
        return BigDecimal.valueOf(numerator).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominator), 1, RoundingMode.HALF_UP).doubleValue();
    }

    private record SummaryRaw(long activeCustomers, long newCustomers, long returningCustomers, long repeatCustomers, long bookings) {}
    private record DailyVolumeRaw(LocalDate day, long newCustomers, long returningCustomers, long bookings) {}
    private record RevenuePoint(LocalDate day, BigDecimal revenue) {}
    private record LifecycleRaw(long new30d, long activeRepeat, long atRisk, long dormant, long lapsed) {}
}
