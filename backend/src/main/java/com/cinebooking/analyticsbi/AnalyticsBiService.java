package com.cinebooking.analyticsbi;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import static com.cinebooking.analyticsbi.AnalyticsBiDtos.*;

@Service
public class AnalyticsBiService {
    public static final String STRATEGY_VERSION = "V75-ANALYTICS-BI-5";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final List<String> EVIDENCE_POLICY = List.of(
            "REAL_OPERATIONAL_DATA_ONLY",
            "REALIZED_SUCCESS_PAYMENTS_ONLY",
            "NO_SYNTHETIC_FUNNEL_EVENTS",
            "NO_RAW_CUSTOMER_EMAIL_IN_LTV_TABLE",
            "COHORT_30D_MATURITY_EXPLICIT",
            "PAST_SHOWTIMES_ONLY_FOR_EFFICIENCY"
    );

    private final JdbcTemplate jdbc;

    public AnalyticsBiService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public AnalyticsBiSummary summary(int requestedDays) {
        int days = bound(requestedDays, 30, 365);
        Instant end = Instant.now();
        Instant start = end.minusSeconds(days * 86_400L);
        return new AnalyticsBiSummary(
                STRATEGY_VERSION,
                end,
                days,
                start,
                end,
                funnel(start),
                cohorts(days),
                topCustomers(),
                paymentConversion(start),
                movieEfficiency(start, end),
                cinemaEfficiency(start, end),
                EVIDENCE_POLICY
        );
    }

    private BookingFunnel funnel(Instant start) {
        Timestamp cutoff = Timestamp.from(start);
        long bookingAttempts = scalarLong("select count(*) from booking where created_at>=?", cutoff);
        long confirmedBookings = scalarLong("select count(*) from booking where created_at>=? and confirmed_at is not null", cutoff);
        long paymentAttempts = scalarLong("select count(distinct p.booking_id) from payment p join booking b on b.id=p.booking_id where b.created_at>=? and b.confirmed_at is not null", cutoff);
        long successfulPayments = scalarLong("select count(distinct p.booking_id) from payment p join booking b on b.id=p.booking_id where b.created_at>=? and b.confirmed_at is not null and p.status='SUCCESS'", cutoff);
        long checkedInBookings = scalarLong("select count(distinct t.booking_id) from ticket_checkin_log t join booking b on b.id=t.booking_id where b.created_at>=? and b.confirmed_at is not null and exists (select 1 from payment p where p.booking_id=b.id and p.status='SUCCESS')", cutoff);

        List<FunnelStage> stages = new ArrayList<>();
        appendStage(stages, "BOOKING_ATTEMPT", "Booking attempts", bookingAttempts, bookingAttempts);
        appendStage(stages, "CONFIRMED", "Confirmed bookings", confirmedBookings, bookingAttempts);
        appendStage(stages, "PAYMENT_ATTEMPT", "Bookings with payment attempt", paymentAttempts, bookingAttempts);
        appendStage(stages, "PAID", "Bookings with successful payment", successfulPayments, bookingAttempts);
        appendStage(stages, "CHECKED_IN", "Checked-in bookings", checkedInBookings, bookingAttempts);
        return new BookingFunnel(
                "Cohort by booking.created_at in the selected window; payment/check-in stages are nested inside confirmed and successfully paid bookings.",
                stages
        );
    }

    private void appendStage(List<FunnelStage> stages, String code, String label, long count, long startCount) {
        long previous = stages.isEmpty() ? count : stages.get(stages.size() - 1).count();
        double fromPrevious = stages.isEmpty() ? 100.0 : percent(count, previous);
        double fromStart = stages.isEmpty() ? 100.0 : percent(count, startCount);
        stages.add(new FunnelStage(code, label, count, fromPrevious, fromStart));
    }

    private List<CohortRow> cohorts(int days) {
        int months = Math.max(3, Math.min(12, (int) Math.ceil(days / 30.0)));
        return jdbc.query(
                "with users as (" +
                        " select u.id,u.created_at,date_trunc('month',u.created_at at time zone 'Asia/Ho_Chi_Minh')::date cohort_month" +
                        " from app_user u where u.role='USER' and u.created_at>=now()-(? * interval '1 month')" +
                        "), b30 as (" +
                        " select u.id,count(b.id) confirmed_30d from users u left join booking b on b.user_id=u.id" +
                        " and b.confirmed_at is not null and b.confirmed_at>=u.created_at and b.confirmed_at<u.created_at+interval '30 day'" +
                        " group by u.id" +
                        ")" +
                        " select u.cohort_month,count(*) registered_users," +
                        " count(*) filter(where b30.confirmed_30d>=1) activated_users," +
                        " count(*) filter(where b30.confirmed_30d>=2) repeat_30d_users" +
                        " from users u join b30 on b30.id=u.id group by u.cohort_month order by u.cohort_month desc",
                (rs, rowNum) -> {
                    LocalDate month = rs.getObject("cohort_month", LocalDate.class);
                    long registered = rs.getLong("registered_users");
                    long activated = rs.getLong("activated_users");
                    long repeat = rs.getLong("repeat_30d_users");
                    LocalDate today = LocalDate.now(BUSINESS_ZONE);
                    boolean matured = !month.plusMonths(1).plusDays(30).isAfter(today);
                    return new CohortRow(month, registered, activated, repeat, percent(activated, registered), percent(repeat, registered), matured);
                }, months
        );
    }

    private List<CustomerLtvRow> topCustomers() {
        return jdbc.query(
                "with paid_booking as (" +
                        " select p.booking_id,max(p.amount) amount,max(p.paid_at) paid_at from payment p" +
                        " where p.status='SUCCESS' group by p.booking_id" +
                        ")" +
                        " select u.id::text user_id,u.email,count(pb.booking_id) paid_bookings," +
                        " coalesce(sum(pb.amount),0) realized_revenue,min(pb.paid_at) first_paid_at,max(pb.paid_at) last_paid_at" +
                        " from app_user u left join booking b on b.user_id=u.id left join paid_booking pb on pb.booking_id=b.id" +
                        " where u.role='USER' group by u.id,u.email order by realized_revenue desc,paid_bookings desc,u.id limit 20",
                (rs, rowNum) -> {
                    String userId = rs.getString("user_id");
                    long paidBookings = rs.getLong("paid_bookings");
                    BigDecimal revenue = money(rs.getBigDecimal("realized_revenue"));
                    return new CustomerLtvRow(
                            customerRef(userId),
                            maskEmail(rs.getString("email")),
                            paidBookings,
                            revenue,
                            divide(revenue, paidBookings),
                            instant(rs.getTimestamp("first_paid_at")),
                            instant(rs.getTimestamp("last_paid_at"))
                    );
                }
        );
    }

    private List<PaymentConversionRow> paymentConversion(Instant start) {
        return jdbc.query(
                "select p.provider,count(*) attempts," +
                        " count(*) filter(where p.status='SUCCESS') successful_attempts," +
                        " count(*) filter(where p.status='FAILED') failed_attempts," +
                        " count(*) filter(where p.status not in ('SUCCESS','FAILED')) other_attempts," +
                        " coalesce(sum(p.amount) filter(where p.status='SUCCESS'),0) successful_amount" +
                        " from payment p where p.created_at>=? group by p.provider order by attempts desc,p.provider",
                (rs, rowNum) -> {
                    long attempts = rs.getLong("attempts");
                    long success = rs.getLong("successful_attempts");
                    return new PaymentConversionRow(
                            rs.getString("provider"),
                            attempts,
                            success,
                            rs.getLong("failed_attempts"),
                            rs.getLong("other_attempts"),
                            percent(success, attempts),
                            money(rs.getBigDecimal("successful_amount"))
                    );
                }, Timestamp.from(start)
        );
    }

    private List<MovieEfficiencyRow> movieEfficiency(Instant start, Instant end) {
        return jdbc.query(
                efficiencyCte() +
                        " select m.title movie_title,count(*) completed_showtimes,coalesce(sum(ss.tickets_sold),0) tickets_sold," +
                        " coalesce(sum(ss.seat_capacity),0) seat_capacity,coalesce(sum(ss.realized_revenue),0) realized_revenue" +
                        " from show_stats ss join movie m on m.id=ss.movie_id" +
                        " group by m.id,m.title order by realized_revenue desc,tickets_sold desc,m.title limit 20",
                (rs, rowNum) -> movieRow(rs.getString("movie_title"), rs.getLong("completed_showtimes"), rs.getLong("tickets_sold"), rs.getLong("seat_capacity"), money(rs.getBigDecimal("realized_revenue"))),
                Timestamp.from(start), Timestamp.from(end)
        );
    }

    private List<CinemaEfficiencyRow> cinemaEfficiency(Instant start, Instant end) {
        return jdbc.query(
                efficiencyCte() +
                        " select c.name cinema_name,count(*) completed_showtimes,coalesce(sum(ss.tickets_sold),0) tickets_sold," +
                        " coalesce(sum(ss.seat_capacity),0) seat_capacity,coalesce(sum(ss.realized_revenue),0) realized_revenue" +
                        " from show_stats ss join auditorium a on a.id=ss.auditorium_id join cinema c on c.id=a.cinema_id" +
                        " group by c.id,c.name order by realized_revenue desc,tickets_sold desc,c.name",
                (rs, rowNum) -> cinemaRow(rs.getString("cinema_name"), rs.getLong("completed_showtimes"), rs.getLong("tickets_sold"), rs.getLong("seat_capacity"), money(rs.getBigDecimal("realized_revenue"))),
                Timestamp.from(start), Timestamp.from(end)
        );
    }

    private String efficiencyCte() {
        return "with paid_booking as (" +
                " select p.booking_id,max(p.amount) amount from payment p where p.status='SUCCESS' group by p.booking_id" +
                "), ticket_by_show as (" +
                " select bs.showtime_id,count(*) tickets_sold from booking_seat bs join booking b on b.id=bs.booking_id" +
                " where b.confirmed_at is not null and bs.released_at is null group by bs.showtime_id" +
                "), revenue_by_show as (" +
                " select b.showtime_id,coalesce(sum(pb.amount),0) realized_revenue from booking b join paid_booking pb on pb.booking_id=b.id group by b.showtime_id" +
                "), show_stats as (" +
                " select st.id,st.movie_id,st.auditorium_id," +
                " (select count(*) from seat s where s.auditorium_id=st.auditorium_id) seat_capacity," +
                " coalesce(t.tickets_sold,0) tickets_sold,coalesce(r.realized_revenue,0) realized_revenue" +
                " from showtime st left join ticket_by_show t on t.showtime_id=st.id left join revenue_by_show r on r.showtime_id=st.id" +
                " where st.start_time>=? and st.start_time<?" +
                ")";
    }

    private MovieEfficiencyRow movieRow(String title, long shows, long tickets, long capacity, BigDecimal revenue) {
        return new MovieEfficiencyRow(title, shows, tickets, capacity, percent(tickets, capacity), revenue, divide(revenue, shows), divide(revenue, capacity));
    }

    private CinemaEfficiencyRow cinemaRow(String name, long shows, long tickets, long capacity, BigDecimal revenue) {
        return new CinemaEfficiencyRow(name, shows, tickets, capacity, percent(tickets, capacity), revenue, divide(revenue, shows), divide(revenue, capacity));
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

    private BigDecimal divide(BigDecimal value, long denominator) {
        if (denominator <= 0) return BigDecimal.ZERO;
        return value.divide(BigDecimal.valueOf(denominator), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    private Instant instant(Timestamp value) {
        return value == null ? null : value.toInstant();
    }

    private String customerRef(String id) {
        if (id == null || id.isBlank()) return "USER-UNKNOWN";
        String compact = id.replace("-", "").toUpperCase(Locale.ROOT);
        return "USER-" + compact.substring(0, Math.min(8, compact.length()));
    }

    private String maskEmail(String email) {
        if (email == null || email.isBlank() || !email.contains("@")) return "***";
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String visible = local.isEmpty() ? "" : local.substring(0, 1);
        return visible + "***@" + parts[1];
    }

    private int bound(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }
}
