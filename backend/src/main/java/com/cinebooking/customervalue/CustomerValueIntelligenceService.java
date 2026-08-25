package com.cinebooking.customervalue;

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
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import static com.cinebooking.customervalue.CustomerValueDtos.*;

@Service
public class CustomerValueIntelligenceService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final List<Integer> ALLOWED_PERIOD_DAYS = List.of(90, 365);

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final StaffProfileRepository staffProfiles;
    private final CinemaRepository cinemas;

    public CustomerValueIntelligenceService(
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

    public CustomerValueScorecard scorecard(String email, UUID requestedCinemaId, int periodDays) {
        AppUser actor = operator(email);
        UUID cinemaId = resolveCinema(actor, requestedCinemaId);
        validatePeriod(periodDays);

        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        LocalDate from = today.minusDays(periodDays - 1L);
        LocalDate toExclusive = today.plusDays(1);

        List<CustomerMetricRaw> raw = customerMetrics(from, toExclusive, cinemaId);
        Map<UUID, Integer> recencyScores = quintileScores(raw,
                Comparator.comparingLong((CustomerMetricRaw row) -> recencyDays(row, today))
                        .thenComparing(CustomerMetricRaw::customerId));
        Map<UUID, Integer> frequencyScores = quintileScores(raw,
                Comparator.comparingLong(CustomerMetricRaw::lifetimeBookings).reversed()
                        .thenComparing(CustomerMetricRaw::customerId));
        Map<UUID, Integer> monetaryScores = quintileScores(raw,
                Comparator.comparing(CustomerMetricRaw::lifetimeRevenue).reversed()
                        .thenComparing(CustomerMetricRaw::customerId));

        List<ScoredCustomer> scored = raw.stream().map(row -> {
            long recency = recencyDays(row, today);
            int r = recencyScores.getOrDefault(row.customerId(), 1);
            int f = frequencyScores.getOrDefault(row.customerId(), 1);
            int m = monetaryScores.getOrDefault(row.customerId(), 1);
            return new ScoredCustomer(row, recency, r, f, m, segment(row, recency, r, f, m));
        }).toList();

        BigDecimal activeBaseLifetimeRevenue = scored.stream()
                .map(row -> row.raw().lifetimeRevenue())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long lifetimeBookings = scored.stream().mapToLong(row -> row.raw().lifetimeBookings()).sum();
        BigDecimal periodRevenue = periodRevenue(from, toExclusive, cinemaId);

        List<ScoredCustomer> byValue = scored.stream()
                .sorted(Comparator.comparing((ScoredCustomer row) -> row.raw().lifetimeRevenue()).reversed()
                        .thenComparingLong(row -> row.recencyDays())
                        .thenComparing(row -> row.raw().customerId()))
                .toList();

        String cinemaName = cinemaId == null ? "Toàn hệ thống" : cinema(cinemaId).getName();
        return new CustomerValueScorecard(
                cinemaId,
                cinemaName,
                cinemaId == null ? "ALL_CINEMAS" : "CINEMA",
                periodDays,
                from,
                today,
                Instant.now(),
                scored.size(),
                money(periodRevenue),
                money(activeBaseLifetimeRevenue),
                averageMoney(activeBaseLifetimeRevenue, scored.size()),
                averageCount(lifetimeBookings, scored.size()),
                medianRecency(scored),
                topShare(byValue, activeBaseLifetimeRevenue),
                rfmSegments(scored, activeBaseLifetimeRevenue),
                valueBands(byValue, activeBaseLifetimeRevenue),
                topCustomers(byValue)
        );
    }

    private List<CustomerMetricRaw> customerMetrics(LocalDate from, LocalDate toExclusive, UUID cinemaId) {
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
                ), active as (
                  select distinct customer_id from confirmed where booking_date>=? and booking_date<?
                ), history as (
                  select customer_id,min(booking_date) first_date,max(booking_date) last_date,count(*) lifetime_bookings
                  from confirmed group by customer_id
                ), paid as (
                  select b.purchaser_user_id customer_id,coalesce(sum(p.amount),0) lifetime_revenue
                  from payment p
                  join booking b on b.id=p.booking_id
                  join app_user u on u.id=b.purchaser_user_id and u.role='USER'
                  join showtime st on st.id=b.showtime_id
                  join auditorium a on a.id=st.auditorium_id
                  where p.status='SUCCESS' and p.paid_at is not null
                """ + scopeFilter + """
                  group by b.purchaser_user_id
                )
                select h.customer_id,h.first_date,h.last_date,h.lifetime_bookings,
                       coalesce(p.lifetime_revenue,0) lifetime_revenue
                from active x
                join history h on h.customer_id=x.customer_id
                left join paid p on p.customer_id=x.customer_id
                order by h.last_date desc,h.customer_id
                """;
        List<Object> args = new ArrayList<>();
        if (cinemaId != null) args.add(cinemaId);
        args.add(Date.valueOf(from));
        args.add(Date.valueOf(toExclusive));
        if (cinemaId != null) args.add(cinemaId);
        return jdbc.query(sql, (rs, rowNum) -> new CustomerMetricRaw(
                rs.getObject("customer_id", UUID.class),
                rs.getObject("first_date", LocalDate.class),
                rs.getObject("last_date", LocalDate.class),
                rs.getLong("lifetime_bookings"),
                money(rs.getBigDecimal("lifetime_revenue"))
        ), args.toArray());
    }

    private BigDecimal periodRevenue(LocalDate from, LocalDate toExclusive, UUID cinemaId) {
        String scopeFilter = cinemaId == null ? "" : " and a.cinema_id=?";
        String sql = """
                select coalesce(sum(p.amount),0) revenue
                from payment p
                join booking b on b.id=p.booking_id
                join app_user u on u.id=b.purchaser_user_id and u.role='USER'
                join showtime st on st.id=b.showtime_id
                join auditorium a on a.id=st.auditorium_id
                where p.status='SUCCESS' and p.paid_at is not null
                  and date(p.paid_at at time zone 'Asia/Ho_Chi_Minh')>=?
                  and date(p.paid_at at time zone 'Asia/Ho_Chi_Minh')<?
                """ + scopeFilter;
        List<Object> args = new ArrayList<>(List.of(Date.valueOf(from), Date.valueOf(toExclusive)));
        if (cinemaId != null) args.add(cinemaId);
        BigDecimal result = jdbc.query(sql, (rs, rowNum) -> money(rs.getBigDecimal("revenue")), args.toArray())
                .stream().findFirst().orElse(BigDecimal.ZERO.setScale(2));
        return money(result);
    }

    private Map<UUID, Integer> quintileScores(List<CustomerMetricRaw> rows, Comparator<CustomerMetricRaw> comparator) {
        List<CustomerMetricRaw> sorted = rows.stream().sorted(comparator).toList();
        Map<UUID, Integer> result = new HashMap<>();
        int count = sorted.size();
        if (count == 0) return result;
        for (int index = 0; index < count; index++) {
            int score = Math.max(1, 5 - (int) Math.floor((double) index * 5.0 / count));
            result.put(sorted.get(index).customerId(), score);
        }
        return result;
    }

    private SegmentCode segment(CustomerMetricRaw row, long recencyDays, int r, int f, int m) {
        if (r >= 4 && f >= 4 && m >= 4) return SegmentCode.CHAMPIONS;
        if (f >= 4 && r >= 3) return SegmentCode.LOYAL;
        if (row.lifetimeBookings() == 1 && recencyDays <= 30) return SegmentCode.NEW_RECENT;
        if (m >= 4 && r >= 3) return SegmentCode.HIGH_VALUE;
        if (r <= 2 && (f >= 3 || m >= 3)) return SegmentCode.NEEDS_ATTENTION;
        return SegmentCode.DEVELOPING;
    }

    private List<RfmSegment> rfmSegments(List<ScoredCustomer> rows, BigDecimal totalRevenue) {
        Map<SegmentCode, SegmentAccumulator> acc = new EnumMap<>(SegmentCode.class);
        for (SegmentCode code : SegmentCode.values()) acc.put(code, new SegmentAccumulator());
        for (ScoredCustomer row : rows) {
            SegmentAccumulator bucket = acc.get(row.segment());
            bucket.customers++;
            bucket.revenue = bucket.revenue.add(row.raw().lifetimeRevenue());
        }
        List<RfmSegment> result = new ArrayList<>();
        for (SegmentCode code : SegmentCode.values()) {
            SegmentAccumulator bucket = acc.get(code);
            result.add(new RfmSegment(
                    code.name(), code.label, code.definition, bucket.customers,
                    money(bucket.revenue), percentage(bucket.revenue, totalRevenue)
            ));
        }
        return List.copyOf(result);
    }

    private List<ValueBand> valueBands(List<ScoredCustomer> rows, BigDecimal totalRevenue) {
        Map<ValueBandCode, SegmentAccumulator> acc = new LinkedHashMap<>();
        for (ValueBandCode code : ValueBandCode.values()) acc.put(code, new SegmentAccumulator());
        int count = rows.size();
        for (int index = 0; index < count; index++) {
            ValueBandCode code = valueBand(index, count);
            SegmentAccumulator bucket = acc.get(code);
            bucket.customers++;
            bucket.revenue = bucket.revenue.add(rows.get(index).raw().lifetimeRevenue());
        }
        List<ValueBand> result = new ArrayList<>();
        for (ValueBandCode code : ValueBandCode.values()) {
            SegmentAccumulator bucket = acc.get(code);
            result.add(new ValueBand(
                    code.name(), code.label, code.definition, bucket.customers,
                    money(bucket.revenue), percentage(bucket.revenue, totalRevenue)
            ));
        }
        return List.copyOf(result);
    }

    private ValueBandCode valueBand(int index, int count) {
        if (count <= 0) return ValueBandCode.LONG_TAIL;
        double percentile = (double) (index + 1) / count;
        if (index == 0 || percentile <= 0.10) return ValueBandCode.TOP_10;
        if (percentile <= 0.25) return ValueBandCode.NEXT_15;
        if (percentile <= 0.50) return ValueBandCode.MIDDLE_25;
        return ValueBandCode.LONG_TAIL;
    }

    private List<CustomerValueRow> topCustomers(List<ScoredCustomer> rows) {
        return rows.stream().limit(20).map(row -> new CustomerValueRow(
                customerRef(row.raw().customerId()),
                row.raw().firstDate(),
                row.raw().lastDate(),
                row.recencyDays(),
                row.raw().lifetimeBookings(),
                money(row.raw().lifetimeRevenue()),
                row.recencyScore(),
                row.frequencyScore(),
                row.monetaryScore(),
                row.recencyScore() + row.frequencyScore() + row.monetaryScore(),
                row.segment().name()
        )).toList();
    }

    private String customerRef(UUID customerId) {
        return "KH-" + customerId.toString().substring(0, 8).toUpperCase(Locale.ROOT);
    }

    private long recencyDays(CustomerMetricRaw row, LocalDate today) {
        return Math.max(0, ChronoUnit.DAYS.between(row.lastDate(), today));
    }

    private double medianRecency(List<ScoredCustomer> rows) {
        if (rows.isEmpty()) return 0.0;
        List<Long> values = rows.stream().map(ScoredCustomer::recencyDays).sorted().toList();
        int middle = values.size() / 2;
        if (values.size() % 2 == 1) return values.get(middle);
        return BigDecimal.valueOf(values.get(middle - 1) + values.get(middle))
                .divide(BigDecimal.valueOf(2), 1, RoundingMode.HALF_UP).doubleValue();
    }

    private double topShare(List<ScoredCustomer> rows, BigDecimal totalRevenue) {
        if (rows.isEmpty() || totalRevenue.signum() <= 0) return 0.0;
        int topCount = Math.max(1, (int) Math.ceil(rows.size() * 0.10));
        BigDecimal topRevenue = rows.stream().limit(topCount)
                .map(row -> row.raw().lifetimeRevenue()).reduce(BigDecimal.ZERO, BigDecimal::add);
        return percentage(topRevenue, totalRevenue);
    }

    private AppUser operator(String email) {
        AppUser actor = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Không tìm thấy tài khoản vận hành"));
        if (actor.getRole() != Role.ADMIN && actor.getRole() != Role.MANAGER) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Chỉ Manager/Admin được xem Customer Value & RFM Intelligence");
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
            throw new ApiException(HttpStatus.FORBIDDEN, "Manager chỉ xem Customer Value & RFM Intelligence của rạp mình");
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
            throw new ApiException(HttpStatus.BAD_REQUEST, "Customer Value chỉ hỗ trợ cửa sổ 90 hoặc 365 ngày");
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

    private double percentage(BigDecimal numerator, BigDecimal denominator) {
        if (denominator == null || denominator.signum() <= 0) return 0.0;
        return money(numerator).multiply(BigDecimal.valueOf(100))
                .divide(denominator, 1, RoundingMode.HALF_UP).doubleValue();
    }

    private record CustomerMetricRaw(UUID customerId, LocalDate firstDate, LocalDate lastDate, long lifetimeBookings, BigDecimal lifetimeRevenue) {}
    private record ScoredCustomer(CustomerMetricRaw raw, long recencyDays, int recencyScore, int frequencyScore, int monetaryScore, SegmentCode segment) {}

    private static final class SegmentAccumulator {
        long customers;
        BigDecimal revenue = BigDecimal.ZERO;
    }

    private enum SegmentCode {
        CHAMPIONS("Champions", "R>=4, F>=4, M>=4 trong tập khách active hiện tại"),
        LOYAL("Loyal", "Frequency>=4 và Recency>=3 sau khi loại Champions"),
        NEW_RECENT("New recent", "Chỉ 1 booking CONFIRMED và mua trong 30 ngày gần nhất"),
        HIGH_VALUE("High value", "Monetary>=4 và Recency>=3 sau các nhóm ưu tiên trước"),
        NEEDS_ATTENTION("Needs attention", "Recency<=2 nhưng Frequency hoặc Monetary vẫn >=3"),
        DEVELOPING("Developing", "Phần còn lại của tập khách active, không gán nhãn rời bỏ");

        private final String label;
        private final String definition;
        SegmentCode(String label, String definition) { this.label = label; this.definition = definition; }
    }

    private enum ValueBandCode {
        TOP_10("Top ~10%", "Nhóm đầu theo realized lifetime revenue; tối thiểu 1 khách khi tập không rỗng"),
        NEXT_15("10-25%", "Nhóm kế tiếp theo realized lifetime revenue"),
        MIDDLE_25("25-50%", "Nửa trên còn lại theo realized lifetime revenue"),
        LONG_TAIL("50-100%", "Nửa dưới theo realized lifetime revenue");

        private final String label;
        private final String definition;
        ValueBandCode(String label, String definition) { this.label = label; this.definition = definition; }
    }
}
