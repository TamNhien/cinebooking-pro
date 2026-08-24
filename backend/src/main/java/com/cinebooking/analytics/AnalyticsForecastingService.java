package com.cinebooking.analytics;

import com.cinebooking.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

import static com.cinebooking.analytics.AnalyticsDtos.*;

@Service
public class AnalyticsForecastingService {
    public static final String FORECAST_ALGORITHM = "V51-WEEKDAY-WEIGHTED-MA-1";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final JdbcTemplate jdbc;

    public AnalyticsForecastingService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public V51Bundle bundle(int requestedDays, UUID cinemaId) {
        int days = Math.max(7, Math.min(requestedDays, 365));
        Instant now = Instant.now();
        Instant currentStart = now.minus(Duration.ofDays(days));
        Instant previousStart = currentStart.minus(Duration.ofDays(days));

        PeriodStats current = periodStats(currentStart, now, cinemaId);
        PeriodStats previous = periodStats(previousStart, currentStart, cinemaId);
        PeriodComparison comparison = new PeriodComparison(
                current.window(),
                previous.window(),
                deltaPct(current.window().revenue(), previous.window().revenue()),
                deltaPct(current.window().bookings(), previous.window().bookings()),
                deltaPct(current.window().tickets(), previous.window().tickets()),
                round(current.window().occupancyRate() - previous.window().occupancyRate(), 1)
        );

        RevenueForecast forecast = forecast(cinemaId);
        MarginSummary margin = margin(currentStart, now, cinemaId, current.window().revenue());
        List<AuditoriumPerformance> auditoriums = auditoriumPerformance(days, cinemaId);
        List<ConcessionCostBasis> costBasis = costBasis(cinemaId);
        List<AnalyticsSnapshot> snapshots = snapshots(cinemaId, 36);
        return new V51Bundle(comparison, forecast, margin, auditoriums, costBasis, snapshots);
    }

    public RevenueForecast forecast(UUID cinemaId) {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        LocalDate historyStartDay = today.minusDays(63);
        Instant historyStart = historyStartDay.atStartOfDay(BUSINESS_ZONE).toInstant();
        Instant historyEnd = today.plusDays(1).atStartOfDay(BUSINESS_ZONE).toInstant();
        String cinemaFilter = cinemaId == null ? "" : " and a.cinema_id=?";
        List<Object> params = new ArrayList<>(List.of(jdbcTime(historyStart), jdbcTime(historyEnd)));
        if (cinemaId != null) params.add(cinemaId);

        Map<LocalDate, BigDecimal> history = new HashMap<>();
        jdbc.query(
                "select date(p.paid_at at time zone 'Asia/Ho_Chi_Minh') d,coalesce(sum(p.amount),0) revenue " +
                        "from payment p join booking b on b.id=p.booking_id join showtime st on st.id=b.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id " +
                        "where p.status='SUCCESS' and p.paid_at>=? and p.paid_at<?" + cinemaFilter +
                        " group by 1 order by 1",
                rs -> {
                    history.put(rs.getObject("d", LocalDate.class), money(rs.getBigDecimal("revenue")));
                },
                params.toArray()
        );

        List<ForecastPoint> points = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        for (int offset = 1; offset <= 7; offset++) {
            LocalDate target = today.plusDays(offset);
            BigDecimal weighted = BigDecimal.ZERO;
            int weightTotal = 0;
            int nonZero = 0;
            int samples = 0;
            for (int week = 1; week <= 4; week++) {
                LocalDate sampleDay = target.minusWeeks(week);
                BigDecimal value = history.getOrDefault(sampleDay, BigDecimal.ZERO);
                int weight = 5 - week; // 4,3,2,1 - newest matching weekday wins.
                weighted = weighted.add(value.multiply(BigDecimal.valueOf(weight)));
                weightTotal += weight;
                samples++;
                if (value.signum() > 0) nonZero++;
            }
            BigDecimal predicted = weightTotal == 0
                    ? BigDecimal.ZERO
                    : weighted.divide(BigDecimal.valueOf(weightTotal), 2, RoundingMode.HALF_UP);
            double confidence = round(Math.min(92.0, 48.0 + nonZero * 10.0 + samples * 1.0), 1);
            points.add(new ForecastPoint(target, predicted, confidence, samples));
            total = total.add(predicted);
        }
        return new RevenueForecast(FORECAST_ALGORITHM, today, money(total), List.copyOf(points));
    }

    public List<ConcessionCostBasis> costBasis(UUID cinemaId) {
        String filter = cinemaId == null ? "" : " where c.id=?";
        Object[] args = cinemaId == null ? new Object[]{} : new Object[]{cinemaId};
        return jdbc.query(
                "select c.id cinema_id,c.name cinema_name,p.id product_id,p.name product_name," +
                        "coalesce(cp.price,p.price) selling_price,cb.unit_cost,cb.updated_at " +
                        "from cinema c cross join concession_product p " +
                        "left join cinema_concession_price cp on cp.cinema_id=c.id and cp.product_id=p.id and cp.active=true " +
                        "left join cinema_concession_cost_basis cb on cb.cinema_id=c.id and cb.product_id=p.id " +
                        filter + " order by c.name,p.sort_order,p.name",
                (rs, i) -> new ConcessionCostBasis(
                        rs.getObject("cinema_id", UUID.class),
                        rs.getString("cinema_name"),
                        rs.getObject("product_id", UUID.class),
                        rs.getString("product_name"),
                        money(rs.getBigDecimal("selling_price")),
                        moneyNullable(rs.getBigDecimal("unit_cost")),
                        rs.getBigDecimal("unit_cost") != null,
                        rs.getTimestamp("updated_at") == null ? null : rs.getTimestamp("updated_at").toInstant()
                ), args
        );
    }

    public ConcessionCostBasis updateCostBasis(CostBasisUpdate request, String updatedBy) {
        if (request == null || request.cinemaId() == null || request.productId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "cinemaId và productId là bắt buộc.");
        }
        if (request.unitCost() != null && request.unitCost().signum() < 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Giá vốn không được âm.");
        }
        Long cinemaExists = jdbc.queryForObject("select count(*) from cinema where id=?", Long.class, request.cinemaId());
        Long productExists = jdbc.queryForObject("select count(*) from concession_product where id=?", Long.class, request.productId());
        if (cinemaExists == null || cinemaExists == 0 || productExists == null || productExists == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy rạp hoặc sản phẩm bắp nước.");
        }

        if (request.unitCost() == null) {
            jdbc.update("delete from cinema_concession_cost_basis where cinema_id=? and product_id=?", request.cinemaId(), request.productId());
        } else {
            jdbc.update(
                    "insert into cinema_concession_cost_basis(id,cinema_id,product_id,unit_cost,source,updated_by,updated_at) " +
                            "values(gen_random_uuid(),?,?,?,'MANUAL',?,now()) " +
                            "on conflict(cinema_id,product_id) do update set unit_cost=excluded.unit_cost,source='MANUAL',updated_by=excluded.updated_by,updated_at=now()",
                    request.cinemaId(), request.productId(), money(request.unitCost()), updatedBy
            );
        }
        return costBasis(request.cinemaId()).stream()
                .filter(x -> x.productId().equals(request.productId()))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy cost basis sau khi cập nhật."));
    }

    public List<AuditoriumPerformance> auditoriumPerformance(int requestedDays, UUID cinemaId) {
        int days = Math.max(7, Math.min(requestedDays, 365));
        String filter = cinemaId == null ? "" : " and a.cinema_id=?";
        Object[] args = cinemaId == null ? new Object[]{days, days, days} : new Object[]{days, cinemaId, days, cinemaId, days, cinemaId};
        return jdbc.query(
                "with sales as (" +
                        "select a.id auditorium_id,coalesce(sum(p.amount),0) revenue,count(distinct b.id) bookings " +
                        "from payment p join booking b on b.id=p.booking_id join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where p.status='SUCCESS' and p.paid_at>=now()-(? * interval '1 day')" + filter + " group by a.id" +
                        "), sold as (" +
                        "select a.id auditorium_id,count(bs.id) tickets from booking_seat bs join booking b on b.id=bs.booking_id " +
                        "join showtime st on st.id=bs.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where b.status='CONFIRMED' and bs.released_at is null and st.start_time>=now()-(? * interval '1 day') and st.start_time<=now()" + filter + " group by a.id" +
                        "), capacity as (" +
                        "select a.id auditorium_id,count(se.id) capacity from showtime st join auditorium a on a.id=st.auditorium_id " +
                        "join seat se on se.auditorium_id=a.id and se.seat_type<>'BLOCKED' " +
                        "where st.start_time>=now()-(? * interval '1 day') and st.start_time<=now() and coalesce(st.status,'OPEN')<>'CANCELLED'" + filter + " group by a.id" +
                        ") " +
                        "select a.id,a.name,c.id cinema_id,c.name cinema_name,coalesce(sales.revenue,0) revenue,coalesce(sales.bookings,0) bookings," +
                        "coalesce(sold.tickets,0) tickets,coalesce(capacity.capacity,0) capacity " +
                        "from auditorium a join cinema c on c.id=a.cinema_id left join sales on sales.auditorium_id=a.id " +
                        "left join sold on sold.auditorium_id=a.id left join capacity on capacity.auditorium_id=a.id " +
                        (cinemaId == null ? "" : "where a.cinema_id=? ") +
                        "order by revenue desc,tickets desc,c.name,a.name",
                (rs, i) -> {
                    long tickets = rs.getLong("tickets");
                    long capacity = rs.getLong("capacity");
                    return new AuditoriumPerformance(
                            rs.getObject("id", UUID.class), rs.getString("name"),
                            rs.getObject("cinema_id", UUID.class), rs.getString("cinema_name"),
                            money(rs.getBigDecimal("revenue")), rs.getLong("bookings"), tickets, capacity,
                            percentage(tickets, capacity)
                    );
                }, auditoriumArgs(days, cinemaId)
        );
    }

    public List<AnalyticsSnapshot> snapshots(UUID cinemaId, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        String filter = cinemaId == null ? "" : " where s.cinema_id=?";
        List<Object> params = new ArrayList<>();
        if (cinemaId != null) params.add(cinemaId);
        params.add(safeLimit);
        return jdbc.query(
                "select s.*,c.name cinema_name from analytics_snapshot s join cinema c on c.id=s.cinema_id" + filter +
                        " order by s.period_start desc,s.period_kind,s.cinema_id limit ?",
                (rs, i) -> new AnalyticsSnapshot(
                        rs.getObject("id", UUID.class), rs.getObject("cinema_id", UUID.class), rs.getString("cinema_name"),
                        rs.getString("period_kind"), rs.getObject("period_start", LocalDate.class), rs.getObject("period_end", LocalDate.class),
                        money(rs.getBigDecimal("revenue")), money(rs.getBigDecimal("ticket_revenue")), money(rs.getBigDecimal("concession_revenue")),
                        moneyNullable(rs.getBigDecimal("concession_cost")), moneyNullable(rs.getBigDecimal("gross_margin")),
                        rs.getLong("bookings"), rs.getLong("tickets"), rs.getLong("capacity"),
                        round(rs.getDouble("occupancy_rate"), 1), round(rs.getDouble("cost_coverage_rate"), 1),
                        money(rs.getBigDecimal("forecast_next_7d")), rs.getString("forecast_algorithm"), rs.getTimestamp("generated_at").toInstant()
                ), params.toArray()
        );
    }

    public void captureClosedPeriods(UUID cinemaId) {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        LocalDate daily = today.minusDays(1);
        captureSnapshot(cinemaId, "DAILY", daily, daily);

        LocalDate currentMonday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weeklyEnd = currentMonday.minusDays(1);
        LocalDate weeklyStart = weeklyEnd.minusDays(6);
        captureSnapshot(cinemaId, "WEEKLY", weeklyStart, weeklyEnd);

        LocalDate monthEnd = today.withDayOfMonth(1).minusDays(1);
        LocalDate monthStart = monthEnd.withDayOfMonth(1);
        captureSnapshot(cinemaId, "MONTHLY", monthStart, monthEnd);
    }

    private void captureSnapshot(UUID cinemaId, String kind, LocalDate periodStart, LocalDate periodEnd) {
        Instant start = periodStart.atStartOfDay(BUSINESS_ZONE).toInstant();
        Instant endExclusive = periodEnd.plusDays(1).atStartOfDay(BUSINESS_ZONE).toInstant();
        PeriodStats stats = periodStats(start, endExclusive, cinemaId);
        MarginSummary margin = margin(start, endExclusive, cinemaId, stats.window().revenue());
        RevenueForecast forecast = forecast(cinemaId);
        jdbc.update(
                "insert into analytics_snapshot(" +
                        "id,cinema_id,period_kind,period_start,period_end,revenue,ticket_revenue,concession_revenue,concession_cost,gross_margin," +
                        "bookings,tickets,capacity,occupancy_rate,cost_coverage_rate,forecast_next_7d,forecast_algorithm,generated_at" +
                        ") values(gen_random_uuid(),?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,now()) " +
                        "on conflict(cinema_id,period_kind,period_start) do update set " +
                        "period_end=excluded.period_end,revenue=excluded.revenue,ticket_revenue=excluded.ticket_revenue," +
                        "concession_revenue=excluded.concession_revenue,concession_cost=excluded.concession_cost,gross_margin=excluded.gross_margin," +
                        "bookings=excluded.bookings,tickets=excluded.tickets,capacity=excluded.capacity,occupancy_rate=excluded.occupancy_rate," +
                        "cost_coverage_rate=excluded.cost_coverage_rate,forecast_next_7d=excluded.forecast_next_7d," +
                        "forecast_algorithm=excluded.forecast_algorithm,generated_at=now()",
                cinemaId, kind, periodStart, periodEnd,
                stats.window().revenue(), margin.ticketRevenue(), margin.concessionRevenue(), margin.concessionCost(), margin.grossMargin(),
                stats.window().bookings(), stats.window().tickets(), stats.capacity(), BigDecimal.valueOf(stats.window().occupancyRate()),
                BigDecimal.valueOf(margin.costCoverageRate()), forecast.next7DaysRevenue(), forecast.algorithm()
        );
    }

    private PeriodStats periodStats(Instant start, Instant end, UUID cinemaId) {
        String filter = cinemaId == null ? "" : " and a.cinema_id=?";
        BigDecimal revenue = money(jdbc.queryForObject(
                "select coalesce(sum(p.amount),0) from payment p join booking b on b.id=p.booking_id " +
                        "join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where p.status='SUCCESS' and p.paid_at>=? and p.paid_at<?" + filter,
                BigDecimal.class, timeArgs(start, end, cinemaId)));
        long bookings = number(jdbc.queryForObject(
                "select count(*) from booking b join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where b.status='CONFIRMED' and b.confirmed_at>=? and b.confirmed_at<?" + filter,
                Long.class, timeArgs(start, end, cinemaId)));
        long tickets = number(jdbc.queryForObject(
                "select count(*) from booking_seat bs join booking b on b.id=bs.booking_id join showtime st on st.id=bs.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id where b.status='CONFIRMED' and bs.released_at is null " +
                        "and b.confirmed_at>=? and b.confirmed_at<?" + filter,
                Long.class, timeArgs(start, end, cinemaId)));
        long[] occupancy = jdbc.queryForObject(
                "select coalesce(sum(x.sold),0) sold,coalesce(sum(x.capacity),0) capacity from (" +
                        "select st.id,(select count(*) from seat se where se.auditorium_id=st.auditorium_id and se.seat_type<>'BLOCKED') capacity," +
                        "(select count(*) from booking_seat bs join booking b on b.id=bs.booking_id where bs.showtime_id=st.id and b.status='CONFIRMED' and bs.released_at is null) sold " +
                        "from showtime st join auditorium a on a.id=st.auditorium_id where st.start_time>=? and st.start_time<? " +
                        "and coalesce(st.status,'OPEN')<>'CANCELLED'" + filter + ") x",
                (rs, rowNum) -> new long[]{rs.getLong("sold"), rs.getLong("capacity")}, timeArgs(start, end, cinemaId));
        LocalDate from = start.atZone(BUSINESS_ZONE).toLocalDate();
        LocalDate to = end.minusMillis(1).atZone(BUSINESS_ZONE).toLocalDate();
        return new PeriodStats(new PeriodWindow(from, to, revenue, bookings, tickets, percentage(occupancy[0], occupancy[1])), occupancy[1]);
    }

    private MarginSummary margin(Instant start, Instant end, UUID cinemaId, BigDecimal totalRevenue) {
        String filter = cinemaId == null ? "" : " and a.cinema_id=?";
        MarginRaw raw = jdbc.queryForObject(
                "select coalesce(sum(bc.quantity),0) units," +
                        "coalesce(sum(case when cb.unit_cost is not null then bc.quantity else 0 end),0) costed_units," +
                        "coalesce(sum(case when cb.unit_cost is not null then bc.quantity*cb.unit_cost else 0 end),0) known_cost," +
                        "coalesce(sum(bc.subtotal),0) concession_revenue " +
                        "from booking_concession bc join booking b on b.id=bc.booking_id join showtime st on st.id=b.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id " +
                        "left join cinema_concession_cost_basis cb on cb.cinema_id=a.cinema_id and cb.product_id=bc.product_id " +
                        "where b.status='CONFIRMED' and b.confirmed_at>=? and b.confirmed_at<?" + filter,
                (rs, rowNum) -> new MarginRaw(rs.getLong("units"), rs.getLong("costed_units"), money(rs.getBigDecimal("known_cost")), money(rs.getBigDecimal("concession_revenue"))),
                timeArgs(start, end, cinemaId));
        long units = raw == null ? 0 : raw.units();
        long costed = raw == null ? 0 : raw.costedUnits();
        BigDecimal concessionRevenue = raw == null ? BigDecimal.ZERO : raw.concessionRevenue();
        BigDecimal ticketRevenue = money(totalRevenue.subtract(concessionRevenue).max(BigDecimal.ZERO));
        double coverage = units == 0 ? 100.0 : round(costed * 100.0 / units, 1);

        // Unknown cost stays NULL. Never silently convert incomplete cost knowledge into cost 0.
        BigDecimal concessionCost = units == costed ? (raw == null ? BigDecimal.ZERO : raw.knownCost()) : null;
        BigDecimal grossMargin = concessionCost == null ? null : money(totalRevenue.subtract(concessionCost));
        Double marginRate = grossMargin == null || totalRevenue.signum() == 0
                ? null
                : round(grossMargin.multiply(HUNDRED).divide(totalRevenue, 4, RoundingMode.HALF_UP).doubleValue(), 1);
        return new MarginSummary(money(totalRevenue), ticketRevenue, concessionRevenue, concessionCost, grossMargin, marginRate, coverage, units, costed);
    }

    private Object jdbcTime(Instant instant) {
        // PostgreSQL TIMESTAMPTZ + pgJDBC 42.7.x does not infer java.time.Instant
        // when JdbcTemplate binds an untyped Object argument. OffsetDateTime is
        // natively supported and preserves the exact UTC instant.
        return instant.atOffset(ZoneOffset.UTC);
    }

    private Object[] timeArgs(Instant start, Instant end, UUID cinemaId) {
        Object jdbcStart = jdbcTime(start);
        Object jdbcEnd = jdbcTime(end);
        return cinemaId == null ? new Object[]{jdbcStart, jdbcEnd} : new Object[]{jdbcStart, jdbcEnd, cinemaId};
    }

    private Object[] auditoriumArgs(int days, UUID cinemaId) {
        if (cinemaId == null) return new Object[]{days, days, days};
        return new Object[]{days, cinemaId, days, cinemaId, days, cinemaId, cinemaId};
    }

    private BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO.setScale(2) : value.setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal moneyNullable(BigDecimal value) {
        return value == null ? null : value.setScale(2, RoundingMode.HALF_UP);
    }

    private long number(Long value) {
        return value == null ? 0L : value;
    }

    private double percentage(long numerator, long denominator) {
        return denominator <= 0 ? 0.0 : round(numerator * 100.0 / denominator, 1);
    }

    private double deltaPct(BigDecimal current, BigDecimal previous) {
        if (previous == null || previous.signum() == 0) return current != null && current.signum() > 0 ? 100.0 : 0.0;
        return round(current.subtract(previous).multiply(HUNDRED).divide(previous, 4, RoundingMode.HALF_UP).doubleValue(), 1);
    }

    private double deltaPct(long current, long previous) {
        if (previous == 0) return current > 0 ? 100.0 : 0.0;
        return round((current - previous) * 100.0 / previous, 1);
    }

    private double round(double value, int scale) {
        double factor = Math.pow(10, scale);
        return Math.round(value * factor) / factor;
    }

    private record PeriodStats(PeriodWindow window, long capacity) {}
    private record MarginRaw(long units, long costedUnits, BigDecimal knownCost, BigDecimal concessionRevenue) {}

    public record V51Bundle(
            PeriodComparison comparison,
            RevenueForecast forecast,
            MarginSummary margin,
            List<AuditoriumPerformance> auditoriumPerformance,
            List<ConcessionCostBasis> costBasis,
            List<AnalyticsSnapshot> snapshots
    ) {}
}
