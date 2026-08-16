package com.cinebooking.analytics;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static com.cinebooking.analytics.AnalyticsDtos.*;

@Service
public class AdminAnalyticsService {
    private final JdbcTemplate jdbc;

    public AdminAnalyticsService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Dashboard dashboard(int requestedDays, UUID cinemaId) {
        int days = Math.max(7, Math.min(requestedDays, 365));
        String cinemaFilter = cinemaId == null ? "" : " and a.cinema_id = ? ";

        BigDecimal revenue = money(queryScalar(
                "select coalesce(sum(p.amount),0) " +
                        "from payment p join booking b on b.id=p.booking_id " +
                        "join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where p.status='SUCCESS' and p.paid_at>=now()-(? * interval '1 day')" + cinemaFilter,
                BigDecimal.class, args(days, cinemaId)));

        long confirmedBookings = number(queryScalar(
                "select count(distinct b.id) from booking b " +
                        "join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where b.status='CONFIRMED' and b.confirmed_at>=now()-(? * interval '1 day')" + cinemaFilter,
                Long.class, args(days, cinemaId)));

        long tickets = number(queryScalar(
                "select count(*) from booking_seat bs join booking b on b.id=bs.booking_id " +
                        "join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where b.status='CONFIRMED' and bs.released_at is null " +
                        "and b.confirmed_at>=now()-(? * interval '1 day')" + cinemaFilter,
                Long.class, args(days, cinemaId)));

        BigDecimal concessionRevenue = money(queryScalar(
                "select coalesce(sum(bc.subtotal),0) from booking_concession bc join booking b on b.id=bc.booking_id " +
                        "join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where b.status='CONFIRMED' and b.confirmed_at>=now()-(? * interval '1 day')" + cinemaFilter,
                BigDecimal.class, args(days, cinemaId)));

        long users = number(jdbc.queryForObject("select count(*) from app_user", Long.class));
        long newUsers = number(jdbc.queryForObject(
                "select count(*) from app_user where created_at>=now()-(? * interval '1 day')", Long.class, days));

        long checkIns = number(queryScalar(
                "select count(*) from ticket_checkin_log t join cinema c on c.id=t.cinema_id " +
                        "where t.checked_in_at>=now()-(? * interval '1 day')" +
                        (cinemaId == null ? "" : " and t.cinema_id = ?"),
                Long.class, args(days, cinemaId)));

        double paymentSuccessRate = percentage(queryPair(
                "select " +
                        "count(*) filter (where p.status in ('SUCCESS','REFUNDED')) as numerator, " +
                        "count(*) filter (where p.status <> 'PENDING') as denominator " +
                        "from payment p join booking b on b.id=p.booking_id " +
                        "join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where p.created_at>=now()-(? * interval '1 day')" + cinemaFilter,
                args(days, cinemaId)));

        double refundRate = percentage(queryPair(
                "select " +
                        "count(*) filter (where b.status='REFUNDED') as numerator, " +
                        "count(*) filter (where b.status in ('CONFIRMED','REFUNDED')) as denominator " +
                        "from booking b join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where coalesce(b.refunded_at,b.confirmed_at,b.created_at)>=now()-(? * interval '1 day')" + cinemaFilter,
                args(days, cinemaId)));

        long[] occupancy = queryPair(
                "select coalesce(sum(x.sold),0) numerator, coalesce(sum(x.capacity),0) denominator from (" +
                        "select st.id, " +
                        "(select count(*) from seat se where se.auditorium_id=st.auditorium_id and se.seat_type<>'BLOCKED') capacity, " +
                        "(select count(*) from booking_seat bs join booking b on b.id=bs.booking_id " +
                        " where bs.showtime_id=st.id and b.status='CONFIRMED' and bs.released_at is null) sold " +
                        "from showtime st join auditorium a on a.id=st.auditorium_id " +
                        "where st.start_time>=now()-(? * interval '1 day') and st.start_time<=now() " +
                        "and coalesce(st.status,'OPEN')<>'CANCELLED'" + cinemaFilter + ") x",
                args(days, cinemaId));

        BigDecimal averageOrderValue = confirmedBookings == 0
                ? BigDecimal.ZERO
                : revenue.divide(BigDecimal.valueOf(confirmedBookings), 2, RoundingMode.HALF_UP);

        Kpi kpi = new Kpi(
                revenue,
                confirmedBookings,
                users,
                tickets,
                concessionRevenue,
                averageOrderValue,
                percentage(occupancy),
                paymentSuccessRate,
                refundRate,
                checkIns,
                newUsers
        );

        List<DailyPoint> daily = jdbc.query(
                "select date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh') d, " +
                        "coalesce(sum((select max(p.amount) from payment p where p.booking_id=b.id and p.status='SUCCESS')),0) r, " +
                        "count(*) bookings, " +
                        "coalesce(sum((select count(*) from booking_seat bs where bs.booking_id=b.id and bs.released_at is null)),0) tickets, " +
                        "count(*) filter (where exists(select 1 from ticket_checkin_log t where t.booking_id=b.id)) checkins " +
                        "from booking b join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where b.status='CONFIRMED' and b.confirmed_at>=now()-(? * interval '1 day')" + cinemaFilter +
                        " group by date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh') order by d",
                (rs, i) -> new DailyPoint(
                        rs.getObject("d", LocalDate.class),
                        money(rs.getBigDecimal("r")),
                        rs.getLong("bookings"),
                        rs.getLong("tickets"),
                        rs.getLong("checkins")
                ), args(days, cinemaId));

        List<NameValue> movies = jdbc.query(
                "select m.title n, coalesce(sum(p.amount),0) v, count(distinct b.id) c " +
                        "from payment p join booking b on b.id=p.booking_id join showtime st on st.id=b.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id join movie m on m.id=st.movie_id " +
                        "where p.status='SUCCESS' and p.paid_at>=now()-(? * interval '1 day')" + cinemaFilter +
                        " group by m.id,m.title order by v desc limit 7",
                (rs, i) -> new NameValue(rs.getString("n"), money(rs.getBigDecimal("v")), rs.getLong("c")),
                args(days, cinemaId));

        List<NameValue> providers = jdbc.query(
                "select p.provider n, coalesce(sum(p.amount),0) v, count(*) c " +
                        "from payment p join booking b on b.id=p.booking_id join showtime st on st.id=b.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id " +
                        "where p.status='SUCCESS' and p.paid_at>=now()-(? * interval '1 day')" + cinemaFilter +
                        " group by p.provider order by v desc",
                (rs, i) -> new NameValue(rs.getString("n"), money(rs.getBigDecimal("v")), rs.getLong("c")),
                args(days, cinemaId));

        List<NameValue> topConcessions = jdbc.query(
                "select bc.product_name n, coalesce(sum(bc.subtotal),0) v, coalesce(sum(bc.quantity),0) c " +
                        "from booking_concession bc join booking b on b.id=bc.booking_id join showtime st on st.id=b.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id " +
                        "where b.status='CONFIRMED' and b.confirmed_at>=now()-(? * interval '1 day')" + cinemaFilter +
                        " group by bc.product_name order by v desc limit 7",
                (rs, i) -> new NameValue(rs.getString("n"), money(rs.getBigDecimal("v")), rs.getLong("c")),
                args(days, cinemaId));

        List<CinemaPerformance> cinemaPerformance = jdbc.query(
                "with successful_bookings as (" +
                        "select b.id,a.cinema_id,max(p.amount) revenue," +
                        "(select count(*) from booking_seat bs where bs.booking_id=b.id and bs.released_at is null) tickets " +
                        "from payment p join booking b on b.id=p.booking_id join showtime st on st.id=b.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id " +
                        "where p.status='SUCCESS' and p.paid_at>=now()-(? * interval '1 day') group by b.id,a.cinema_id" +
                        "), sales as (select cinema_id,coalesce(sum(revenue),0) revenue,count(*) bookings,coalesce(sum(tickets),0) tickets from successful_bookings group by cinema_id" +
                        "), capacity as (" +
                        "select a.cinema_id, count(se.id) capacity from showtime st join auditorium a on a.id=st.auditorium_id " +
                        "join seat se on se.auditorium_id=st.auditorium_id and se.seat_type<>'BLOCKED' " +
                        "where st.start_time>=now()-(? * interval '1 day') and st.start_time<=now() and coalesce(st.status,'OPEN')<>'CANCELLED' group by a.cinema_id" +
                        "), sold as (" +
                        "select a.cinema_id, count(bs.id) sold from booking_seat bs join booking b on b.id=bs.booking_id " +
                        "join showtime st on st.id=bs.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where b.status='CONFIRMED' and bs.released_at is null and st.start_time>=now()-(? * interval '1 day') and st.start_time<=now() group by a.cinema_id" +
                        ") " +
                        "select c.id,c.name,coalesce(sales.revenue,0) revenue,coalesce(sales.bookings,0) bookings,coalesce(sales.tickets,0) tickets," +
                        "coalesce(capacity.capacity,0) capacity,coalesce(sold.sold,0) sold " +
                        "from cinema c left join sales on sales.cinema_id=c.id left join capacity on capacity.cinema_id=c.id left join sold on sold.cinema_id=c.id " +
                        (cinemaId == null ? "" : "where c.id=? ") +
                        "order by revenue desc, c.name",
                (rs, i) -> new CinemaPerformance(
                        rs.getObject("id", UUID.class),
                        rs.getString("name"),
                        money(rs.getBigDecimal("revenue")),
                        rs.getLong("bookings"),
                        rs.getLong("tickets"),
                        rs.getLong("capacity"),
                        percentage(new long[]{rs.getLong("sold"), rs.getLong("capacity")})
                ), cinemaPerformanceArgs(days, cinemaId));

        List<ShowtimePerformance> topShowtimes = jdbc.query(
                "select st.id,m.title movie,c.name cinema,a.name auditorium,st.start_time, " +
                        "coalesce((select sum(x.amount) from (select max(p.amount) amount from payment p join booking b2 on b2.id=p.booking_id where b2.showtime_id=st.id and p.status='SUCCESS' group by b2.id) x),0) revenue, " +
                        "(select count(*) from booking_seat bs join booking b3 on b3.id=bs.booking_id where bs.showtime_id=st.id and b3.status='CONFIRMED' and bs.released_at is null) tickets, " +
                        "(select count(*) from seat se where se.auditorium_id=st.auditorium_id and se.seat_type<>'BLOCKED') capacity " +
                        "from showtime st join auditorium a on a.id=st.auditorium_id join cinema c on c.id=a.cinema_id join movie m on m.id=st.movie_id " +
                        "where st.start_time>=now()-(? * interval '1 day') and st.start_time<=now()" +
                        (cinemaId == null ? "" : " and a.cinema_id=?") +
                        " order by tickets desc,revenue desc limit 10",
                (rs, i) -> {
                    long sold = rs.getLong("tickets");
                    long capacity = rs.getLong("capacity");
                    return new ShowtimePerformance(
                            rs.getObject("id", UUID.class),
                            rs.getString("movie"),
                            rs.getString("cinema"),
                            rs.getString("auditorium"),
                            rs.getTimestamp("start_time").toInstant(),
                            money(rs.getBigDecimal("revenue")),
                            sold,
                            capacity,
                            percentage(new long[]{sold, capacity})
                    );
                }, args(days, cinemaId));

        List<SeatHeatCell> seatHeatmap = jdbc.query(
                "select se.row_label,se.seat_number,count(*) bookings,coalesce(sum(bs.price),0) revenue " +
                        "from booking_seat bs join booking b on b.id=bs.booking_id join seat se on se.id=bs.seat_id " +
                        "join showtime st on st.id=bs.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where b.status='CONFIRMED' and bs.released_at is null and b.confirmed_at>=now()-(? * interval '1 day')" + cinemaFilter +
                        " group by se.row_label,se.seat_number order by se.row_label,se.seat_number",
                (rs, i) -> new SeatHeatCell(
                        rs.getString("row_label"),
                        rs.getInt("seat_number"),
                        rs.getLong("bookings"),
                        money(rs.getBigDecimal("revenue"))
                ), args(days, cinemaId));

        List<HourlyDemand> hourlyDemand = jdbc.query(
                "select extract(hour from (st.start_time at time zone 'Asia/Ho_Chi_Minh'))::int as hour_of_day, " +
                        "count(*) bookings, " +
                        "coalesce(sum((select count(*) from booking_seat bs where bs.booking_id=b.id and bs.released_at is null)),0) tickets, " +
                        "coalesce(sum((select max(p.amount) from payment p where p.booking_id=b.id and p.status='SUCCESS')),0) revenue " +
                        "from booking b join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where b.status='CONFIRMED' and b.confirmed_at>=now()-(? * interval '1 day')" + cinemaFilter +
                        " group by 1 order by 1",
                (rs, i) -> new HourlyDemand(
                        rs.getInt("hour_of_day"),
                        rs.getLong("bookings"),
                        rs.getLong("tickets"),
                        money(rs.getBigDecimal("revenue"))
                ), args(days, cinemaId));

        List<StaffPerformance> staffPerformance = jdbc.query(
                "select t.staff_user_id,u.full_name,coalesce(sp.employee_code,'-') employee_code,c.name cinema,count(*) checked_tickets " +
                        "from ticket_checkin_log t join app_user u on u.id=t.staff_user_id " +
                        "left join staff_profile sp on sp.user_id=t.staff_user_id join cinema c on c.id=t.cinema_id " +
                        "where t.checked_in_at>=now()-(? * interval '1 day')" +
                        (cinemaId == null ? "" : " and t.cinema_id=?") +
                        " group by t.staff_user_id,u.full_name,sp.employee_code,c.name order by checked_tickets desc limit 10",
                (rs, i) -> new StaffPerformance(
                        rs.getObject("staff_user_id", UUID.class),
                        rs.getString("employee_code"),
                        rs.getString("full_name"),
                        rs.getString("cinema"),
                        rs.getLong("checked_tickets")
                ), args(days, cinemaId));

        List<StatusCount> bookingStatuses = jdbc.query(
                "select b.status,count(*) c from booking b join showtime st on st.id=b.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id " +
                        "where b.created_at>=now()-(? * interval '1 day')" + cinemaFilter +
                        " group by b.status order by c desc",
                (rs, i) -> new StatusCount(rs.getString("status"), rs.getLong("c")), args(days, cinemaId));

        List<StatusCount> paymentStatuses = jdbc.query(
                "select p.status,count(*) c from payment p join booking b on b.id=p.booking_id join showtime st on st.id=b.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id " +
                        "where p.created_at>=now()-(? * interval '1 day')" + cinemaFilter +
                        " group by p.status order by c desc",
                (rs, i) -> new StatusCount(rs.getString("status"), rs.getLong("c")), args(days, cinemaId));

        return new Dashboard(
                kpi,
                daily,
                movies,
                providers,
                topConcessions,
                cinemaPerformance,
                topShowtimes,
                seatHeatmap,
                hourlyDemand,
                staffPerformance,
                bookingStatuses,
                paymentStatuses
        );
    }

    private Object[] args(int days, UUID cinemaId) {
        return cinemaId == null ? new Object[]{days} : new Object[]{days, cinemaId};
    }

    private Object[] cinemaPerformanceArgs(int days, UUID cinemaId) {
        List<Object> values = new ArrayList<>();
        values.add(days);
        values.add(days);
        values.add(days);
        if (cinemaId != null) values.add(cinemaId);
        return values.toArray();
    }

    private <T> T queryScalar(String sql, Class<T> type, Object[] args) {
        return jdbc.queryForObject(sql, type, args);
    }

    private long[] queryPair(String sql, Object[] args) {
        return jdbc.queryForObject(sql, (rs, rowNum) -> new long[]{rs.getLong("numerator"), rs.getLong("denominator")}, args);
    }

    private BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private long number(Long value) {
        return value == null ? 0 : value;
    }

    private double percentage(long[] pair) {
        if (pair == null || pair.length < 2 || pair[1] <= 0) return 0.0;
        return BigDecimal.valueOf(pair[0])
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(pair[1]), 2, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
