package com.cinebooking.operationscontrol;

import com.cinebooking.commandcenter.CommandCenterDtos;
import com.cinebooking.commandcenter.CommandCenterService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import static com.cinebooking.operationscontrol.OperationsControlCenterDtos.*;

@Service
public class OperationsControlCenterService {
    private static final int POLL_SECONDS = 5;

    private final JdbcTemplate jdbc;
    private final CommandCenterService commandCenter;

    public OperationsControlCenterService(JdbcTemplate jdbc, CommandCenterService commandCenter) {
        this.jdbc = jdbc;
        this.commandCenter = commandCenter;
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

        List<AlertItem> alerts = new ArrayList<>();
        add(alerts, "CRITICAL", "PAYMENT", "Thanh toán đang chờ đối soát", "Payment REVIEW cần kiểm tra thủ công.", paymentReview, "/admin/payments");
        add(alerts, "CRITICAL", "BOOKING", "Booking PENDING đã quá hạn", "Job expiry chưa giải phóng các booking đã qua expires_at.", pendingPastDue, "/admin/bookings");
        add(alerts, "CRITICAL", "EQUIPMENT", "Thiết bị ngừng hoạt động", "Thiết bị OUT_OF_SERVICE có thể ảnh hưởng vận hành rạp.", equipmentOut, "/admin/maintenance");
        add(alerts, "CRITICAL", "SUPPORT", "Support quá SLA", "Case đang mở đã vượt sla_due_at.", overdueSupport, "/admin/support");
        add(alerts, "CRITICAL", "INCIDENT", "Incident mức CRITICAL", "Sự cố staff đang mở với severity CRITICAL.", criticalIncidents, "/staff/operations");
        add(alerts, "HIGH", "STAFF", "Ca hiện tại chưa có check-in", "Ca đã bắt đầu nhưng chưa có attendance WORKING.", uncoveredActiveShifts, "/staff/operations");
        add(alerts, "HIGH", "INVENTORY", "Hết tồn khả dụng", "Stock on hand trừ reserved đã về 0.", soldOut, "/admin/inventory");
        add(alerts, "MEDIUM", "BOOKING", "Booking sắp hết hạn", "Booking PENDING sẽ hết hạn trong 5 phút tới.", pendingExpiringSoon, "/admin/bookings");
        add(alerts, "MEDIUM", "PAYMENT", "Payment FAILED trong 60 phút", "Tín hiệu lỗi payment gần đây để theo dõi provider/funnel.", paymentFailedLastHour, "/admin/payments");
        add(alerts, "MEDIUM", "EQUIPMENT", "Thiết bị degraded / quá lịch service", "Thiết bị cần theo dõi trước khi thành outage.", equipmentDegraded + equipmentServiceOverdue, "/admin/maintenance");
        add(alerts, "MEDIUM", "INVENTORY", "Tồn kho thấp", "Tồn khả dụng đã chạm low_stock_threshold.", lowStock, "/admin/inventory");
        add(alerts, "LOW", "INCIDENT", "Incident đang mở", "Các incident chưa resolve ngoài mức CRITICAL.", Math.max(0, openIncidents - criticalIncidents), "/staff/operations");
        alerts.sort(Comparator.comparingInt(a -> severityRank(a.severity())));

        String overall = alerts.stream().anyMatch(a -> "CRITICAL".equals(a.severity()))
                ? "ACTION_REQUIRED"
                : alerts.stream().anyMatch(a -> "HIGH".equals(a.severity()) || "MEDIUM".equals(a.severity()))
                ? "WATCH"
                : "HEALTHY";

        return new Snapshot(
                base.cinemaId(), base.cinemaName(), base.scope(), overall, base.generatedAt(), POLL_SECONDS,
                base.todayRevenue(), base.todayConfirmedBookings(), base.todayTickets(), base.todayOccupancyRate(),
                paymentReview, paymentFailedLastHour, pendingBookings, pendingPastDue, pendingExpiringSoon,
                equipmentOut, equipmentDegraded, equipmentMaintenance, equipmentServiceOverdue,
                staffWorking, staffScheduledToday, uncoveredActiveShifts,
                openSupport, overdueSupport, lowStock, soldOut, openIncidents, criticalIncidents,
                domains, List.copyOf(alerts)
        );
    }

    private DomainPulse pulse(String domain, String label, long primary, long warning, String href, boolean critical) {
        String status = critical ? "ACTION_REQUIRED" : (primary + warning > 0 ? "WATCH" : "HEALTHY");
        return new DomainPulse(domain, label, status, primary, warning, href);
    }

    private void add(List<AlertItem> alerts, String severity, String domain, String title, String detail, long count, String href) {
        if (count > 0) alerts.add(new AlertItem(severity, domain, title, detail, count, href));
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
