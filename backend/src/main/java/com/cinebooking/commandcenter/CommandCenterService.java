package com.cinebooking.commandcenter;

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
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import static com.cinebooking.commandcenter.CommandCenterDtos.*;

@Service
public class CommandCenterService {
    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final StaffProfileRepository staffProfiles;
    private final CinemaRepository cinemas;
    private final AnalyticsForecastingService forecasting;

    public CommandCenterService(
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

    public Summary summary(String email, UUID requestedCinemaId) {
        AppUser actor = operator(email);
        UUID cinemaId = resolveCinema(actor, requestedCinemaId);
        String cinemaName = cinemaId == null ? "Toàn hệ thống" : cinema(cinemaId).getName();
        String scope = cinemaId == null ? "ALL_CINEMAS" : "CINEMA";

        BigDecimal revenue = money(scalar(
                "select coalesce(sum(p.amount),0) from payment p " +
                        "join booking b on b.id=p.booking_id join showtime st on st.id=b.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id " +
                        "where p.status='SUCCESS' and date(p.paid_at at time zone 'Asia/Ho_Chi_Minh')=date(now() at time zone 'Asia/Ho_Chi_Minh')" +
                        cinemaFilter("a", cinemaId),
                BigDecimal.class, cinemaArgs(cinemaId)));

        long bookings = number(scalar(
                "select count(*) from booking b join showtime st on st.id=b.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id " +
                        "where b.status='CONFIRMED' and date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh')=date(now() at time zone 'Asia/Ho_Chi_Minh')" +
                        cinemaFilter("a", cinemaId),
                Long.class, cinemaArgs(cinemaId)));

        long tickets = number(scalar(
                "select count(*) from booking_seat bs join booking b on b.id=bs.booking_id " +
                        "join showtime st on st.id=bs.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where b.status='CONFIRMED' and bs.released_at is null " +
                        "and date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh')=date(now() at time zone 'Asia/Ho_Chi_Minh')" +
                        cinemaFilter("a", cinemaId),
                Long.class, cinemaArgs(cinemaId)));

        long[] occupancy = jdbc.queryForObject(
                "select coalesce(sum((select count(*) from booking_seat bs join booking b on b.id=bs.booking_id " +
                        "where bs.showtime_id=st.id and b.status='CONFIRMED' and bs.released_at is null)),0) sold, " +
                        "coalesce(sum((select count(*) from seat se where se.auditorium_id=st.auditorium_id and se.seat_type<>'BLOCKED')),0) capacity " +
                        "from showtime st join auditorium a on a.id=st.auditorium_id " +
                        "where date(st.start_time at time zone 'Asia/Ho_Chi_Minh')=date(now() at time zone 'Asia/Ho_Chi_Minh') " +
                        "and coalesce(st.status,'OPEN')<>'CANCELLED'" + cinemaFilter("a", cinemaId),
                (rs, rowNum) -> new long[]{rs.getLong("sold"), rs.getLong("capacity")},
                cinemaArgs(cinemaId));

        long paymentReview = number(scalar(
                "select count(*) from payment p join booking b on b.id=p.booking_id " +
                        "join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where p.status='REVIEW'" + cinemaFilter("a", cinemaId),
                Long.class, cinemaArgs(cinemaId)));

        long openSupport = countByCinema(
                "select count(*) from customer_support_case s where s.status in ('OPEN','IN_PROGRESS','WAITING_CUSTOMER')",
                "s.cinema_id", cinemaId);
        long overdueSupport = countByCinema(
                "select count(*) from customer_support_case s where s.status in ('OPEN','IN_PROGRESS','WAITING_CUSTOMER') and s.sla_due_at<now()",
                "s.cinema_id", cinemaId);
        long openMaintenance = countByCinema(
                "select count(*) from maintenance_work_order m where m.status in ('OPEN','IN_PROGRESS','BLOCKED')",
                "m.cinema_id", cinemaId);
        long overdueMaintenance = countByCinema(
                "select count(*) from maintenance_work_order m where m.status in ('OPEN','IN_PROGRESS','BLOCKED') and m.due_at is not null and m.due_at<now()",
                "m.cinema_id", cinemaId);
        long openIncidents = countByCinema(
                "select count(*) from staff_incident i where i.status='OPEN'",
                "i.cinema_id", cinemaId);
        long lowStock = countByCinema(
                "select count(*) from cinema_concession_inventory inv where inv.active=true and (inv.stock_on_hand-inv.stock_reserved)<=inv.low_stock_threshold",
                "inv.cinema_id", cinemaId);
        long soldOut = countByCinema(
                "select count(*) from cinema_concession_inventory inv where inv.active=true and (inv.stock_on_hand-inv.stock_reserved)<=0",
                "inv.cinema_id", cinemaId);

        BigDecimal forecastNext7d = forecasting.forecast(cinemaId).next7DaysRevenue();
        List<AttentionItem> attention = attention(paymentReview, overdueSupport, overdueMaintenance, openIncidents, lowStock, soldOut);
        String status = (paymentReview + overdueSupport + overdueMaintenance) > 0
                ? "ACTION_REQUIRED"
                : (openIncidents + lowStock + soldOut) > 0 ? "WATCH" : "HEALTHY";

        return new Summary(
                cinemaId, cinemaName, scope, status, Instant.now(), revenue, bookings, tickets,
                percentage(occupancy), forecastNext7d, paymentReview, openSupport, overdueSupport,
                openMaintenance, overdueMaintenance, openIncidents, lowStock, soldOut, attention
        );
    }

    private List<AttentionItem> attention(long paymentReview, long overdueSupport, long overdueMaintenance, long openIncidents, long lowStock, long soldOut) {
        List<AttentionItem> items = new ArrayList<>();
        if (paymentReview > 0) items.add(new AttentionItem("CRITICAL", "PAYMENT", "Thanh toán cần đối soát thủ công", paymentReview, "/admin/payments"));
        if (overdueSupport > 0) items.add(new AttentionItem("CRITICAL", "SUPPORT", "Yêu cầu hỗ trợ quá SLA", overdueSupport, "/admin/support"));
        if (overdueMaintenance > 0) items.add(new AttentionItem("CRITICAL", "MAINTENANCE", "Work order bảo trì quá hạn", overdueMaintenance, "/admin/maintenance"));
        if (soldOut > 0) items.add(new AttentionItem("HIGH", "INVENTORY", "Sản phẩm đã hết tồn khả dụng", soldOut, "/admin/inventory"));
        if (lowStock > 0) items.add(new AttentionItem("MEDIUM", "INVENTORY", "Sản phẩm chạm ngưỡng tồn thấp", lowStock, "/admin/inventory"));
        if (openIncidents > 0) items.add(new AttentionItem("MEDIUM", "STAFF_OPS", "Sự cố vận hành đang mở", openIncidents, "/staff/operations"));
        return List.copyOf(items);
    }

    private AppUser operator(String email) {
        AppUser actor = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Không tìm thấy tài khoản vận hành"));
        if (actor.getRole() != Role.ADMIN && actor.getRole() != Role.MANAGER) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Chỉ Manager/Admin được xem Operations Command Center");
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
            throw new ApiException(HttpStatus.FORBIDDEN, "Manager chỉ xem Operations Command Center của rạp mình");
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

    private long countByCinema(String sql, String cinemaColumn, UUID cinemaId) {
        String finalSql = sql + (cinemaId == null ? "" : " and " + cinemaColumn + "=?");
        return number(scalar(finalSql, Long.class, cinemaArgs(cinemaId)));
    }

    private String cinemaFilter(String alias, UUID cinemaId) {
        return cinemaId == null ? "" : " and " + alias + ".cinema_id=?";
    }

    private Object[] cinemaArgs(UUID cinemaId) {
        return cinemaId == null ? new Object[]{} : new Object[]{cinemaId};
    }

    private <T> T scalar(String sql, Class<T> type, Object[] args) {
        return jdbc.queryForObject(sql, type, args);
    }

    private long number(Long value) {
        return value == null ? 0L : value;
    }

    private BigDecimal money(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    private double percentage(long[] pair) {
        if (pair == null || pair.length < 2 || pair[1] <= 0) return 0.0;
        return BigDecimal.valueOf(pair[0])
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(pair[1]), 1, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
