package com.cinebooking.operationscontrol;

import com.cinebooking.commandcenter.CommandCenterDtos;
import com.cinebooking.commandcenter.CommandCenterService;
import com.cinebooking.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.*;

import static com.cinebooking.operationscontrol.OperationsControlCenterDtos.*;

@Service
public class OperationsControlCenterService {
    private static final int FALLBACK_REFRESH_SECONDS = 30;
    private static final String REALTIME_TOPIC = "/topic/operations-control";

    private final JdbcTemplate jdbc;
    private final CommandCenterService commandCenter;
    private final OperationsAlertStateService alertStates;

    public OperationsControlCenterService(JdbcTemplate jdbc,
                                          CommandCenterService commandCenter,
                                          OperationsAlertStateService alertStates) {
        this.jdbc = jdbc;
        this.commandCenter = commandCenter;
        this.alertStates = alertStates;
    }

    public List<CinemaOption> cinemaOptions(String email) {
        return commandCenter.cinemaOptions(email).stream()
                .map(c -> new CinemaOption(c.cinemaId(), c.cinemaName()))
                .toList();
    }

    public Snapshot snapshot(String email, UUID requestedCinemaId) {
        CommandCenterDtos.Summary base = commandCenter.summary(email, requestedCinemaId);
        UUID cinemaId = base.cinemaId();

        long paymentReview = base.paymentReviewCount();
        long paymentFailedLastHour = count(
                "select count(*) from payment p join booking b on b.id=p.booking_id " +
                        "join showtime st on st.id=b.showtime_id join auditorium a on a.id=st.auditorium_id " +
                        "where p.status='FAILED' and p.created_at>=now()-interval '1 hour'" + cinemaFilter("a", cinemaId),
                cinemaId);

        long pendingBookings = count(
                "select count(*) from booking b join showtime st on st.id=b.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id where b.status='PENDING'" + cinemaFilter("a", cinemaId),
                cinemaId);
        long pendingPastDue = count(
                "select count(*) from booking b join showtime st on st.id=b.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id where b.status='PENDING' and b.expires_at is not null and b.expires_at<now()" + cinemaFilter("a", cinemaId),
                cinemaId);
        long pendingExpiringSoon = count(
                "select count(*) from booking b join showtime st on st.id=b.showtime_id " +
                        "join auditorium a on a.id=st.auditorium_id where b.status='PENDING' and b.expires_at>=now() " +
                        "and b.expires_at<=now()+interval '5 minutes'" + cinemaFilter("a", cinemaId),
                cinemaId);

        long equipmentOut = countByCinema(
                "select count(*) from cinema_equipment_asset e where e.status='OUT_OF_SERVICE'", "e.cinema_id", cinemaId);
        long equipmentDegraded = countByCinema(
                "select count(*) from cinema_equipment_asset e where e.status='DEGRADED'", "e.cinema_id", cinemaId);
        long equipmentMaintenance = countByCinema(
                "select count(*) from cinema_equipment_asset e where e.status='MAINTENANCE'", "e.cinema_id", cinemaId);
        long equipmentServiceOverdue = countByCinema(
                "select count(*) from cinema_equipment_asset e where e.next_service_due is not null " +
                        "and e.next_service_due<date(now() at time zone 'Asia/Ho_Chi_Minh')", "e.cinema_id", cinemaId);

        long staffWorking = countByCinema(
                "select count(*) from staff_attendance sa where sa.check_out_at is null", "sa.cinema_id", cinemaId);
        long staffScheduledToday = countByCinema(
                "select count(*) from staff_shift ss where ss.shift_date=date(now() at time zone 'Asia/Ho_Chi_Minh') and ss.status='SCHEDULED'",
                "ss.cinema_id", cinemaId);
        long uncoveredActiveShifts = countByCinema(
                "select count(*) from staff_shift ss where ss.shift_date=date(now() at time zone 'Asia/Ho_Chi_Minh') " +
                        "and ss.status='SCHEDULED' " +
                        "and ss.start_time<=(now() at time zone 'Asia/Ho_Chi_Minh')::time " +
                        "and ss.end_time>(now() at time zone 'Asia/Ho_Chi_Minh')::time " +
                        "and not exists(select 1 from staff_attendance sa where sa.shift_id=ss.id and sa.check_out_at is null)",
                "ss.cinema_id", cinemaId);

        long openSupport = base.openSupportCases();
        long overdueSupport = base.overdueSupportCases();
        long lowStock = base.lowStockItems();
        long soldOut = base.soldOutItems();
        long openIncidents = base.openStaffIncidents();
        long criticalIncidents = countByCinema(
                "select count(*) from staff_incident i where i.status='OPEN' and i.severity='CRITICAL'", "i.cinema_id", cinemaId);

        List<DomainPulse> domains = List.of(
                pulse("PAYMENT", "Thanh toán", paymentReview, paymentFailedLastHour, "/admin/payments", paymentReview > 0),
                pulse("BOOKING", "Booking", pendingPastDue, pendingExpiringSoon, "/admin/bookings", pendingPastDue > 0),
                pulse("EQUIPMENT", "Thiết bị", equipmentOut, equipmentDegraded + equipmentServiceOverdue, "/admin/maintenance", equipmentOut > 0),
                pulse("STAFF", "Nhân sự", uncoveredActiveShifts, Math.max(0, staffScheduledToday - staffWorking), "/staff/operations", uncoveredActiveShifts > 0),
                pulse("SUPPORT", "Support", overdueSupport, openSupport, "/admin/support", overdueSupport > 0),
                pulse("INVENTORY", "Inventory", soldOut, lowStock, "/admin/inventory", soldOut > 0),
                pulse("INCIDENT", "Incident", criticalIncidents, Math.max(0, openIncidents - criticalIncidents), "/staff/operations", criticalIncidents > 0)
        );

        List<AlertItem> raw = new ArrayList<>();
        add(raw, cinemaId, "CRITICAL", "PAYMENT", "Thanh toán đang chờ đối soát", "Payment REVIEW cần kiểm tra thủ công.", paymentReview, "/admin/payments");
        add(raw, cinemaId, "CRITICAL", "BOOKING", "Booking PENDING đã quá hạn", "Job expiry chưa giải phóng các booking đã qua expires_at.", pendingPastDue, "/admin/bookings");
        add(raw, cinemaId, "CRITICAL", "EQUIPMENT", "Thiết bị ngừng hoạt động", "Thiết bị OUT_OF_SERVICE có thể ảnh hưởng vận hành rạp.", equipmentOut, "/admin/maintenance");
        add(raw, cinemaId, "CRITICAL", "SUPPORT", "Support quá SLA", "Case đang mở đã vượt sla_due_at.", overdueSupport, "/admin/support");
        add(raw, cinemaId, "CRITICAL", "INCIDENT", "Incident mức CRITICAL", "Sự cố staff đang mở với severity CRITICAL.", criticalIncidents, "/staff/operations");
        add(raw, cinemaId, "HIGH", "STAFF", "Ca hiện tại chưa có check-in", "Ca đã bắt đầu nhưng chưa có attendance WORKING.", uncoveredActiveShifts, "/staff/operations");
        add(raw, cinemaId, "HIGH", "INVENTORY", "Hết tồn khả dụng", "Stock on hand trừ reserved đã về 0.", soldOut, "/admin/inventory");
        add(raw, cinemaId, "MEDIUM", "BOOKING", "Booking sắp hết hạn", "Booking PENDING sẽ hết hạn trong 5 phút tới.", pendingExpiringSoon, "/admin/bookings");
        add(raw, cinemaId, "MEDIUM", "PAYMENT", "Payment FAILED trong 60 phút", "Tín hiệu lỗi payment gần đây để theo dõi provider/funnel.", paymentFailedLastHour, "/admin/payments");
        add(raw, cinemaId, "MEDIUM", "EQUIPMENT", "Thiết bị degraded / quá lịch service", "Thiết bị cần theo dõi trước khi thành outage.", equipmentDegraded + equipmentServiceOverdue, "/admin/maintenance");
        add(raw, cinemaId, "MEDIUM", "INVENTORY", "Tồn kho thấp", "Tồn khả dụng đã chạm low_stock_threshold.", lowStock, "/admin/inventory");
        add(raw, cinemaId, "LOW", "INCIDENT", "Incident đang mở", "Các incident chưa resolve ngoài mức CRITICAL.", Math.max(0, openIncidents - criticalIncidents), "/staff/operations");

        List<AlertItem> alerts = new ArrayList<>(alertStates.decorate(raw));
        alerts.sort(Comparator.comparingInt((AlertItem a) -> stateRank(a.state()))
                .thenComparingInt(a -> severityRank(a.effectiveSeverity())));

        String overall = alerts.stream().filter(a -> !"RESOLVED".equals(a.state())).anyMatch(a -> "CRITICAL".equals(a.effectiveSeverity()))
                ? "ACTION_REQUIRED"
                : alerts.stream().filter(a -> !"RESOLVED".equals(a.state())).anyMatch(a -> "HIGH".equals(a.effectiveSeverity()) || "MEDIUM".equals(a.effectiveSeverity()))
                ? "WATCH"
                : "HEALTHY";

        return new Snapshot(
                base.cinemaId(), base.cinemaName(), base.scope(), overall, base.generatedAt(), FALLBACK_REFRESH_SECONDS,
                "STOMP_WEBSOCKET", REALTIME_TOPIC,
                base.todayRevenue(), base.todayConfirmedBookings(), base.todayTickets(), base.todayOccupancyRate(),
                paymentReview, paymentFailedLastHour, pendingBookings, pendingPastDue, pendingExpiringSoon,
                equipmentOut, equipmentDegraded, equipmentMaintenance, equipmentServiceOverdue,
                staffWorking, staffScheduledToday, uncoveredActiveShifts,
                openSupport, overdueSupport, lowStock, soldOut, openIncidents, criticalIncidents,
                domains, List.copyOf(alerts)
        );
    }

    public Snapshot acknowledge(String email, UUID cinemaId, String fingerprint, String note) {
        AlertItem alert = requireVisibleAlert(email, cinemaId, fingerprint);
        alertStates.acknowledge(alert, email, note);
        return snapshot(email, cinemaId);
    }

    public Snapshot resolve(String email, UUID cinemaId, String fingerprint, String note) {
        AlertItem alert = requireVisibleAlert(email, cinemaId, fingerprint);
        alertStates.resolve(alert, email, note);
        return snapshot(email, cinemaId);
    }

    public List<AlertHistoryItem> history(String email, UUID cinemaId) {
        Set<String> visible = snapshot(email, cinemaId).alerts().stream().map(AlertItem::fingerprint).collect(java.util.stream.Collectors.toSet());
        return alertStates.history(visible);
    }

    private AlertItem requireVisibleAlert(String email, UUID cinemaId, String fingerprint) {
        if (fingerprint == null || fingerprint.isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "Thiếu fingerprint cảnh báo");
        return snapshot(email, cinemaId).alerts().stream()
                .filter(a -> fingerprint.equals(a.fingerprint()))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Cảnh báo không còn tồn tại trong phạm vi hiện tại"));
    }

    private DomainPulse pulse(String domain, String label, long primary, long warning, String href, boolean critical) {
        String status = critical ? "ACTION_REQUIRED" : (primary + warning > 0 ? "WATCH" : "HEALTHY");
        return new DomainPulse(domain, label, status, primary, warning, href);
    }

    private void add(List<AlertItem> alerts, UUID cinemaId, String severity, String domain, String title, String detail, long count, String href) {
        if (count <= 0) return;
        String scopeKey = cinemaId == null ? "ALL_CINEMAS" : cinemaId.toString();
        String fingerprint = UUID.nameUUIDFromBytes((scopeKey + "|" + domain + "|" + title + "|" + href).getBytes(StandardCharsets.UTF_8)).toString();
        alerts.add(new AlertItem(fingerprint, severity, severity, "OPEN", domain, title, detail, count, href, null, null, null, false));
    }

    private int stateRank(String state) {
        return "RESOLVED".equals(state) ? 1 : 0;
    }

    private int severityRank(String severity) {
        return switch (severity) {
            case "CRITICAL" -> 0;
            case "HIGH" -> 1;
            case "MEDIUM" -> 2;
            default -> 3;
        };
    }

    private long count(String sql, UUID cinemaId) {
        Long value = cinemaId == null
                ? jdbc.queryForObject(sql, Long.class)
                : jdbc.queryForObject(sql, Long.class, cinemaId);
        return value == null ? 0 : value;
    }

    private long countByCinema(String sql, String column, UUID cinemaId) {
        return count(sql + (cinemaId == null ? "" : " and " + column + "=?"), cinemaId);
    }

    private String cinemaFilter(String alias, UUID cinemaId) {
        return cinemaId == null ? "" : " and " + alias + ".cinema_id=?";
    }
}
