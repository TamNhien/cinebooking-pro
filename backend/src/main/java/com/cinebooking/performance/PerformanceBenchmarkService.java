package com.cinebooking.performance;

import com.cinebooking.analytics.AnalyticsForecastingService;
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
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import static com.cinebooking.performance.PerformanceBenchmarkDtos.*;

@Service
public class PerformanceBenchmarkService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final List<Integer> ALLOWED_PERIOD_DAYS = List.of(7, 30);

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final StaffProfileRepository staffProfiles;
    private final CinemaRepository cinemas;
    private final AnalyticsForecastingService forecasting;

    public PerformanceBenchmarkService(
            JdbcTemplate jdbc,
            UserRepository users,
            StaffProfileRepository staffProfiles,
            CinemaRepository cinemas,
            AnalyticsForecastingService forecasting
    ) {
        this.jdbc = jdbc;
        this.users = users;
        this.staffProfiles = staffProfiles;
        this.cinemas = cinemas;
        this.forecasting = forecasting;
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

    public Scorecard scorecard(String email, UUID requestedCinemaId, int periodDays) {
        AppUser actor = operator(email);
        UUID cinemaId = resolveCinema(actor, requestedCinemaId);
        validatePeriod(periodDays);

        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        LocalDate from = today.minusDays(periodDays - 1L);
        LocalDate toExclusive = today.plusDays(1);
        LocalDate previousFrom = from.minusDays(periodDays);
        LocalDate previousToExclusive = from;

        List<BranchRaw> raw = branchMetrics(from, toExclusive, previousFrom, previousToExclusive, cinemaId);
        BigDecimal totalRevenue = raw.stream().map(BranchRaw::revenue).reduce(BigDecimal.ZERO, BigDecimal::add);

        List<BranchPerformance> branches = new ArrayList<>();
        List<BranchRaw> ranked = raw.stream()
                .sorted(Comparator.comparing(BranchRaw::revenue).reversed().thenComparing(BranchRaw::cinemaName))
                .toList();
        for (int index = 0; index < ranked.size(); index++) {
            BranchRaw row = ranked.get(index);
            BigDecimal forecast = forecasting.forecast(row.cinemaId()).next7DaysRevenue();
            branches.add(new BranchPerformance(
                    row.cinemaId(), row.cinemaName(), index + 1,
                    money(row.revenue()), money(row.previousRevenue()), delta(row.revenue(), row.previousRevenue()),
                    share(row.revenue(), totalRevenue), row.bookings(), row.tickets(), row.occupiedSeats(), row.capacity(),
                    percentage(row.occupiedSeats(), row.capacity()), average(row.revenue(), row.bookings()), money(forecast)
            ));
        }

        BigDecimal previousRevenue = raw.stream().map(BranchRaw::previousRevenue).reduce(BigDecimal.ZERO, BigDecimal::add);
        long bookings = raw.stream().mapToLong(BranchRaw::bookings).sum();
        long tickets = raw.stream().mapToLong(BranchRaw::tickets).sum();
        long occupiedSeats = raw.stream().mapToLong(BranchRaw::occupiedSeats).sum();
        long capacity = raw.stream().mapToLong(BranchRaw::capacity).sum();
        BigDecimal forecastNext7d = branches.stream().map(BranchPerformance::forecastNext7d).reduce(BigDecimal.ZERO, BigDecimal::add);

        String cinemaName = cinemaId == null ? "Toàn hệ thống" : cinema(cinemaId).getName();
        return new Scorecard(
                cinemaId,
                cinemaName,
                cinemaId == null ? "ALL_CINEMAS" : "CINEMA",
                periodDays,
                from,
                today,
                Instant.now(),
                money(totalRevenue),
                money(previousRevenue),
                delta(totalRevenue, previousRevenue),
                bookings,
                tickets,
                percentage(occupiedSeats, capacity),
                average(totalRevenue, bookings),
                money(forecastNext7d),
                List.copyOf(branches),
                topMovies(from, toExclusive, cinemaId),
                daily(from, toExclusive, cinemaId)
        );
    }

    private List<BranchRaw> branchMetrics(
            LocalDate from,
            LocalDate toExclusive,
            LocalDate previousFrom,
            LocalDate previousToExclusive,
            UUID cinemaId
    ) {
        String filter = cinemaId == null ? "" : " where c.id=?";
        List<Object> args = new ArrayList<>();
        args.add(Date.valueOf(from));
        args.add(Date.valueOf(toExclusive));
        args.add(Date.valueOf(previousFrom));
        args.add(Date.valueOf(previousToExclusive));
        args.add(Date.valueOf(from));
        args.add(Date.valueOf(toExclusive));
        args.add(Date.valueOf(from));
        args.add(Date.valueOf(toExclusive));
        if (cinemaId != null) args.add(cinemaId);

        String sql = """
                with current_revenue as (
                  select a.cinema_id,coalesce(sum(p.amount),0) revenue
                  from payment p join booking b on b.id=p.booking_id
                  join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id
                  where p.status='SUCCESS'
                    and date(p.paid_at at time zone 'Asia/Ho_Chi_Minh')>=?
                    and date(p.paid_at at time zone 'Asia/Ho_Chi_Minh')<?
                  group by a.cinema_id
                ), previous_revenue as (
                  select a.cinema_id,coalesce(sum(p.amount),0) revenue
                  from payment p join booking b on b.id=p.booking_id
                  join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id
                  where p.status='SUCCESS'
                    and date(p.paid_at at time zone 'Asia/Ho_Chi_Minh')>=?
                    and date(p.paid_at at time zone 'Asia/Ho_Chi_Minh')<?
                  group by a.cinema_id
                ), confirmed as (
                  select a.cinema_id,count(distinct b.id) bookings,count(bs.id) tickets
                  from booking b join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id
                  left join booking_seat bs on bs.booking_id=b.id and bs.released_at is null
                  where b.status='CONFIRMED'
                    and date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh')>=?
                    and date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh')<?
                  group by a.cinema_id
                ), showtime_capacity as (
                  select a.cinema_id,
                    coalesce(sum((select count(*) from booking_seat bs join booking b on b.id=bs.booking_id
                      where bs.showtime_id=st.id and bs.released_at is null and b.status='CONFIRMED')),0) occupied,
                    coalesce(sum((select count(*) from seat se where se.auditorium_id=st.auditorium_id and se.seat_type<>'BLOCKED')),0) capacity
                  from showtime st join auditorium a on a.id=st.auditorium_id
                  where date(st.start_time at time zone 'Asia/Ho_Chi_Minh')>=?
                    and date(st.start_time at time zone 'Asia/Ho_Chi_Minh')<?
                    and coalesce(st.status,'OPEN')<>'CANCELLED'
                  group by a.cinema_id
                )
                select c.id cinema_id,c.name cinema_name,
                  coalesce(cr.revenue,0) revenue,coalesce(pr.revenue,0) previous_revenue,
                  coalesce(cf.bookings,0) bookings,coalesce(cf.tickets,0) tickets,
                  coalesce(sc.occupied,0) occupied,coalesce(sc.capacity,0) capacity
                from cinema c
                left join current_revenue cr on cr.cinema_id=c.id
                left join previous_revenue pr on pr.cinema_id=c.id
                left join confirmed cf on cf.cinema_id=c.id
                left join showtime_capacity sc on sc.cinema_id=c.id
                """ + filter + " order by c.name";

        return jdbc.query(sql, (rs, rowNum) -> new BranchRaw(
                rs.getObject("cinema_id", UUID.class),
                rs.getString("cinema_name"),
                money(rs.getBigDecimal("revenue")),
                money(rs.getBigDecimal("previous_revenue")),
                rs.getLong("bookings"),
                rs.getLong("tickets"),
                rs.getLong("occupied"),
                rs.getLong("capacity")
        ), args.toArray());
    }

    private List<MoviePerformance> topMovies(LocalDate from, LocalDate toExclusive, UUID cinemaId) {
        String filter = cinemaId == null ? "" : " and a.cinema_id=?";
        List<Object> args = new ArrayList<>(List.of(Date.valueOf(from), Date.valueOf(toExclusive)));
        if (cinemaId != null) args.add(cinemaId);

        Map<UUID, Long> tickets = new HashMap<>();
        List<Object> ticketArgs = new ArrayList<>(List.of(Date.valueOf(from), Date.valueOf(toExclusive)));
        if (cinemaId != null) ticketArgs.add(cinemaId);
        jdbc.query(
                "select st.movie_id,count(bs.id) tickets from booking b join showtime st on st.id=b.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id join booking_seat bs on bs.booking_id=b.id and bs.released_at is null " +
                        "where b.status='CONFIRMED' and date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh')>=? " +
                        "and date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh')<?" + filter + " group by st.movie_id",
                rs -> tickets.put(rs.getObject("movie_id", UUID.class), rs.getLong("tickets")),
                ticketArgs.toArray()
        );

        return jdbc.query(
                "select m.id movie_id,m.title movie_title,coalesce(sum(p.amount),0) revenue " +
                        "from payment p join booking b on b.id=p.booking_id join showtime st on st.id=b.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id join movie m on m.id=st.movie_id " +
                        "where p.status='SUCCESS' and date(p.paid_at at time zone 'Asia/Ho_Chi_Minh')>=? " +
                        "and date(p.paid_at at time zone 'Asia/Ho_Chi_Minh')<?" + filter +
                        " group by m.id,m.title order by revenue desc,m.title asc limit 5",
                (rs, rowNum) -> {
                    UUID movieId = rs.getObject("movie_id", UUID.class);
                    return new MoviePerformance(movieId, rs.getString("movie_title"), money(rs.getBigDecimal("revenue")), tickets.getOrDefault(movieId, 0L));
                },
                args.toArray()
        );
    }

    private List<DailyPerformance> daily(LocalDate from, LocalDate toExclusive, UUID cinemaId) {
        String paymentFilter = cinemaId == null ? "" : " and a.cinema_id=?";
        Map<LocalDate, BigDecimal> revenue = new HashMap<>();
        List<Object> paymentArgs = new ArrayList<>(List.of(Date.valueOf(from), Date.valueOf(toExclusive)));
        if (cinemaId != null) paymentArgs.add(cinemaId);
        jdbc.query(
                "select date(p.paid_at at time zone 'Asia/Ho_Chi_Minh') day,coalesce(sum(p.amount),0) revenue " +
                        "from payment p join booking b on b.id=p.booking_id join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where p.status='SUCCESS' and date(p.paid_at at time zone 'Asia/Ho_Chi_Minh')>=? " +
                        "and date(p.paid_at at time zone 'Asia/Ho_Chi_Minh')<?" + paymentFilter + " group by 1 order by 1",
                rs -> revenue.put(rs.getObject("day", LocalDate.class), money(rs.getBigDecimal("revenue"))),
                paymentArgs.toArray()
        );

        Map<LocalDate, long[]> volume = new HashMap<>();
        List<Object> bookingArgs = new ArrayList<>(List.of(Date.valueOf(from), Date.valueOf(toExclusive)));
        if (cinemaId != null) bookingArgs.add(cinemaId);
        jdbc.query(
                "select date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh') day,count(distinct b.id) bookings,count(bs.id) tickets " +
                        "from booking b join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "left join booking_seat bs on bs.booking_id=b.id and bs.released_at is null " +
                        "where b.status='CONFIRMED' and date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh')>=? " +
                        "and date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh')<?" + paymentFilter + " group by 1 order by 1",
                rs -> volume.put(rs.getObject("day", LocalDate.class), new long[]{rs.getLong("bookings"), rs.getLong("tickets")}),
                bookingArgs.toArray()
        );

        List<DailyPerformance> points = new ArrayList<>();
        for (LocalDate day = from; day.isBefore(toExclusive); day = day.plusDays(1)) {
            long[] counts = volume.getOrDefault(day, new long[]{0L, 0L});
            points.add(new DailyPerformance(day, revenue.getOrDefault(day, BigDecimal.ZERO.setScale(2)), counts[0], counts[1]));
        }
        return List.copyOf(points);
    }

    private AppUser operator(String email) {
        AppUser actor = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Không tìm thấy tài khoản vận hành"));
        if (actor.getRole() != Role.ADMIN && actor.getRole() != Role.MANAGER) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Chỉ Manager/Admin được xem Performance Benchmarking");
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
            throw new ApiException(HttpStatus.FORBIDDEN, "Manager chỉ xem Performance Benchmarking của rạp mình");
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
            throw new ApiException(HttpStatus.BAD_REQUEST, "Performance Benchmarking chỉ hỗ trợ cửa sổ 7 hoặc 30 ngày");
        }
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal average(BigDecimal value, long count) {
        if (count <= 0) return BigDecimal.ZERO.setScale(2);
        return value.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
    }

    private Double delta(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.signum() == 0) return current == null || current.signum() == 0 ? 0.0 : null;
        return current.subtract(previous)
                .multiply(BigDecimal.valueOf(100))
                .divide(previous, 1, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private double share(BigDecimal value, BigDecimal total) {
        if (total == null || total.signum() == 0) return 0.0;
        return value.multiply(BigDecimal.valueOf(100)).divide(total, 1, RoundingMode.HALF_UP).doubleValue();
    }

    private double percentage(long numerator, long denominator) {
        if (denominator <= 0) return 0.0;
        return BigDecimal.valueOf(numerator).multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(denominator), 1, RoundingMode.HALF_UP).doubleValue();
    }

    private record BranchRaw(
            UUID cinemaId,
            String cinemaName,
            BigDecimal revenue,
            BigDecimal previousRevenue,
            long bookings,
            long tickets,
            long occupiedSeats,
            long capacity
    ) {}
}
