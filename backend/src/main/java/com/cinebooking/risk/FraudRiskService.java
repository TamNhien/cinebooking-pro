package com.cinebooking.risk;

import com.cinebooking.audit.AuditService;
import com.cinebooking.domain.AppUser;
import com.cinebooking.domain.Role;
import com.cinebooking.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import static com.cinebooking.risk.FraudRiskDtos.*;

@Service
public class FraudRiskService {
    private static final String SCORING_VERSION = "V61_RULESET_1";
    private static final Set<String> DISPOSITIONS = Set.of("UNREVIEWED", "CLEARED", "REVIEW", "CHALLENGE", "BLOCK_RECOMMENDED");

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final AuditService audit;

    public FraudRiskService(JdbcTemplate jdbc, UserRepository users, AuditService audit) {
        this.jdbc = jdbc;
        this.users = users;
        this.audit = audit;
    }

    public RiskScorecard scorecard() {
        List<RawRiskRow> rows = jdbc.query(RISK_SQL, (rs, rowNum) -> map(rs));
        List<RiskCustomer> customers = rows.stream()
                .map(this::score)
                .sorted(Comparator.comparingInt(RiskCustomer::riskScore).reversed()
                        .thenComparing(RiskCustomer::lastActivityAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();

        int watch = (int) customers.stream().filter(x -> x.riskScore() >= 30).count();
        int high = (int) customers.stream().filter(x -> x.riskScore() >= 50).count();
        int critical = (int) customers.stream().filter(x -> x.riskScore() >= 70).count();
        int payment = (int) customers.stream().filter(x -> x.failedPayments24h() >= 2).count();
        int velocity = (int) customers.stream().filter(x -> x.bookings30m() >= 3).count();
        int security = (int) customers.stream().filter(x -> x.securityAlerts7d() > 0 || x.failedLogins1h() >= 3).count();

        return new RiskScorecard(
                new RiskSummary(customers.size(), watch, high, critical, payment, velocity, security, Instant.now(), SCORING_VERSION),
                rules(),
                customers
        );
    }

    @Transactional
    public DispositionResult setDisposition(UUID userId, String actorEmail, DispositionRequest request, String ipAddress) {
        AppUser user = users.findById(userId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        if (user.getRole() != Role.USER) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Risk disposition is limited to customer accounts");
        String disposition = normalizeDisposition(request == null ? null : request.disposition());
        String note = sanitizeNote(request == null ? null : request.note());
        String details = "disposition=" + disposition + (note.isBlank() ? "" : "; note=" + note);
        audit.record(actorEmail, "RISK_DISPOSITION_SET", "RISK_CUSTOMER", userId.toString(), details, ipAddress);
        return new DispositionResult(userId, disposition, note, actorEmail, Instant.now());
    }

    private RiskCustomer score(RawRiskRow r) {
        List<RiskSignal> signals = new ArrayList<>();

        if (r.bookings30m >= 6) add(signals, "BOOKING_VELOCITY", "Booking velocity", 30, r.bookings30m + " bookings in 30 minutes", "30m");
        else if (r.bookings30m >= 4) add(signals, "BOOKING_VELOCITY", "Booking velocity", 20, r.bookings30m + " bookings in 30 minutes", "30m");
        else if (r.bookings30m >= 3) add(signals, "BOOKING_VELOCITY", "Booking velocity", 10, r.bookings30m + " bookings in 30 minutes", "30m");

        if (r.failedPayments24h >= 5) add(signals, "PAYMENT_FAILURES", "Repeated payment failures", 35, r.failedPayments24h + " failed payments in 24 hours", "24h");
        else if (r.failedPayments24h >= 3) add(signals, "PAYMENT_FAILURES", "Repeated payment failures", 25, r.failedPayments24h + " failed payments in 24 hours", "24h");
        else if (r.failedPayments24h >= 2) add(signals, "PAYMENT_FAILURES", "Repeated payment failures", 15, r.failedPayments24h + " failed payments in 24 hours", "24h");

        if (r.paymentAttempts24h >= 8) add(signals, "PAYMENT_ATTEMPTS", "Payment attempt volume", 15, r.paymentAttempts24h + " attempts in 24 hours", "24h");
        else if (r.paymentAttempts24h >= 5) add(signals, "PAYMENT_ATTEMPTS", "Payment attempt volume", 8, r.paymentAttempts24h + " attempts in 24 hours", "24h");

        if (r.voucherRedemptions24h >= 4) add(signals, "VOUCHER_VELOCITY", "Voucher redemption velocity", 15, r.voucherRedemptions24h + " redemptions in 24 hours", "24h");
        else if (r.voucherRedemptions24h >= 3) add(signals, "VOUCHER_VELOCITY", "Voucher redemption velocity", 10, r.voucherRedemptions24h + " redemptions in 24 hours", "24h");

        if (r.refunds30d >= 3) add(signals, "REFUND_PATTERN", "Refund concentration", 15, r.refunds30d + " refunded bookings in 30 days", "30d");
        else if (r.refunds30d >= 2) add(signals, "REFUND_PATTERN", "Refund concentration", 8, r.refunds30d + " refunded bookings in 30 days", "30d");

        if (r.maxSecurityRisk7d >= 80) add(signals, "SECURITY_RISK", "High security risk signal", 25, "max security risk " + r.maxSecurityRisk7d + "/100", "7d");
        else if (r.maxSecurityRisk7d >= 60) add(signals, "SECURITY_RISK", "Security risk signal", 18, "max security risk " + r.maxSecurityRisk7d + "/100", "7d");
        else if (r.maxSecurityRisk7d >= 40) add(signals, "SECURITY_RISK", "Security risk signal", 10, "max security risk " + r.maxSecurityRisk7d + "/100", "7d");

        if (r.securityAlerts7d >= 3) add(signals, "SECURITY_ALERT_VOLUME", "Security alert volume", 10, r.securityAlerts7d + " alerts in 7 days", "7d");
        else if (r.securityAlerts7d >= 1) add(signals, "SECURITY_ALERT_VOLUME", "Security alert volume", 5, r.securityAlerts7d + " alert(s) in 7 days", "7d");

        if (r.failedLogins1h >= 6) add(signals, "LOGIN_FAILURES", "Login failure burst", 20, r.failedLogins1h + " failed logins in 1 hour", "1h");
        else if (r.failedLogins1h >= 3) add(signals, "LOGIN_FAILURES", "Login failure burst", 12, r.failedLogins1h + " failed logins in 1 hour", "1h");

        if (r.distinctLoginIps24h >= 5) add(signals, "IP_DIVERSITY", "Login IP diversity", 15, r.distinctLoginIps24h + " distinct IPs in 24 hours", "24h");
        else if (r.distinctLoginIps24h >= 3) add(signals, "IP_DIVERSITY", "Login IP diversity", 8, r.distinctLoginIps24h + " distinct IPs in 24 hours", "24h");

        int total = Math.min(100, signals.stream().mapToInt(RiskSignal::points).sum());
        String level = total >= 70 ? "CRITICAL" : total >= 50 ? "HIGH" : total >= 30 ? "MEDIUM" : "LOW";
        String disposition = parseDisposition(r.dispositionDetails);
        String ref = "CUS-" + r.userId.toString().substring(0, 8).toUpperCase(Locale.ROOT);
        return new RiskCustomer(r.userId, ref, r.fullName, r.email, r.accountEnabled, total, level, disposition,
                r.bookings30m, r.bookings24h, r.failedPayments24h, r.paymentAttempts24h, r.voucherRedemptions24h,
                r.refunds30d, r.securityAlerts7d, r.maxSecurityRisk7d, r.failedLogins1h, r.distinctLoginIps24h,
                max(r.lastBookingAt, r.lastPaymentAt, r.lastSecurityAt, r.lastAuthAt), List.copyOf(signals));
    }

    private static void add(List<RiskSignal> out, String code, String label, int points, String evidence, String window) {
        out.add(new RiskSignal(code, label, points, evidence, window));
    }

    private static String parseDisposition(String details) {
        if (details == null) return "UNREVIEWED";
        for (String allowed : DISPOSITIONS) if (details.contains("disposition=" + allowed)) return allowed;
        return "UNREVIEWED";
    }

    private static String normalizeDisposition(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if (!DISPOSITIONS.contains(normalized) || "UNREVIEWED".equals(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Disposition must be CLEARED, REVIEW, CHALLENGE or BLOCK_RECOMMENDED");
        }
        return normalized;
    }

    private static String sanitizeNote(String value) {
        if (value == null) return "";
        String clean = value.replaceAll("[\\r\\n\\t]+", " ").replaceAll("\\s+", " ").trim();
        return clean.length() <= 400 ? clean : clean.substring(0, 400);
    }

    private static Instant max(Instant... values) {
        Instant result = null;
        for (Instant v : values) if (v != null && (result == null || v.isAfter(result))) result = v;
        return result;
    }

    private static RawRiskRow map(ResultSet rs) throws SQLException {
        return new RawRiskRow(
                rs.getObject("user_id", UUID.class), rs.getString("full_name"), rs.getString("email"), rs.getBoolean("account_enabled"),
                rs.getInt("bookings_30m"), rs.getInt("bookings_24h"), rs.getInt("refunds_30d"),
                rs.getInt("payment_attempts_24h"), rs.getInt("failed_payments_24h"), rs.getInt("voucher_redemptions_24h"),
                rs.getInt("security_alerts_7d"), rs.getInt("max_security_risk_7d"), rs.getInt("failed_logins_1h"), rs.getInt("distinct_login_ips_24h"),
                instant(rs, "last_booking_at"), instant(rs, "last_payment_at"), instant(rs, "last_security_at"), instant(rs, "last_auth_at"), rs.getString("disposition_details")
        );
    }

    private static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp ts = rs.getTimestamp(column);
        return ts == null ? null : ts.toInstant();
    }

    private static List<RiskRule> rules() {
        return List.of(
                new RiskRule("BOOKING_VELOCITY", "Booking velocity", "30m", 30, "3/4/6 bookings raise 10/20/30 points."),
                new RiskRule("PAYMENT_FAILURES", "Repeated payment failures", "24h", 35, "2/3/5 failed payments raise 15/25/35 points."),
                new RiskRule("PAYMENT_ATTEMPTS", "Payment attempt volume", "24h", 15, "5/8 payment attempts raise 8/15 points."),
                new RiskRule("VOUCHER_VELOCITY", "Voucher redemption velocity", "24h", 15, "3/4 voucher redemptions raise 10/15 points."),
                new RiskRule("REFUND_PATTERN", "Refund concentration", "30d", 15, "2/3 refunded bookings raise 8/15 points."),
                new RiskRule("SECURITY_RISK", "Security alert risk", "7d", 25, "Maximum security risk >=40/60/80 raises 10/18/25 points."),
                new RiskRule("SECURITY_ALERT_VOLUME", "Security alert volume", "7d", 10, "1/3 alerts raise 5/10 points."),
                new RiskRule("LOGIN_FAILURES", "Login failure burst", "1h", 20, "3/6 failed logins raise 12/20 points."),
                new RiskRule("IP_DIVERSITY", "Login IP diversity", "24h", 15, "3/5 distinct login IPs raise 8/15 points.")
        );
    }

    private record RawRiskRow(UUID userId, String fullName, String email, boolean accountEnabled,
                              int bookings30m, int bookings24h, int refunds30d,
                              int paymentAttempts24h, int failedPayments24h, int voucherRedemptions24h,
                              int securityAlerts7d, int maxSecurityRisk7d, int failedLogins1h, int distinctLoginIps24h,
                              Instant lastBookingAt, Instant lastPaymentAt, Instant lastSecurityAt, Instant lastAuthAt,
                              String dispositionDetails) {}

    private static final String RISK_SQL = """
            WITH booking_stats AS (
              SELECT purchaser_user_id AS user_id,
                     COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 minutes') AS bookings_30m,
                     COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours') AS bookings_24h,
                     COUNT(*) FILTER (WHERE refunded_at >= CURRENT_TIMESTAMP - INTERVAL '30 days') AS refunds_30d,
                     MAX(created_at) AS last_booking_at
              FROM booking GROUP BY purchaser_user_id
            ), payment_stats AS (
              SELECT payer_user_id AS user_id,
                     COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours') AS payment_attempts_24h,
                     COUNT(*) FILTER (WHERE status='FAILED' AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours') AS failed_payments_24h,
                     MAX(created_at) AS last_payment_at
              FROM payment GROUP BY payer_user_id
            ), voucher_stats AS (
              SELECT user_id,
                     COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours') AS voucher_redemptions_24h
              FROM voucher_redemption GROUP BY user_id
            ), security_stats AS (
              SELECT user_id,
                     COUNT(*) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days') AS security_alerts_7d,
                     COALESCE(MAX(risk_score) FILTER (WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'),0) AS max_security_risk_7d,
                     MAX(created_at) AS last_security_at
              FROM security_alert GROUP BY user_id
            ), auth_stats AS (
              SELECT actor_user_id AS user_id,
                     COUNT(*) FILTER (WHERE action='LOGIN_FAILED' AND created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour') AS failed_logins_1h,
                     COUNT(DISTINCT ip_address) FILTER (WHERE action IN ('LOGIN_FAILED','LOGIN_SUCCESS') AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours' AND ip_address IS NOT NULL AND ip_address<>'') AS distinct_login_ips_24h,
                     MAX(created_at) FILTER (WHERE action IN ('LOGIN_FAILED','LOGIN_SUCCESS')) AS last_auth_at
              FROM audit_log WHERE actor_user_id IS NOT NULL GROUP BY actor_user_id
            )
            SELECT u.id AS user_id, u.full_name, u.email, u.account_enabled,
                   COALESCE(b.bookings_30m,0) AS bookings_30m,
                   COALESCE(b.bookings_24h,0) AS bookings_24h,
                   COALESCE(b.refunds_30d,0) AS refunds_30d,
                   COALESCE(p.payment_attempts_24h,0) AS payment_attempts_24h,
                   COALESCE(p.failed_payments_24h,0) AS failed_payments_24h,
                   COALESCE(v.voucher_redemptions_24h,0) AS voucher_redemptions_24h,
                   COALESCE(s.security_alerts_7d,0) AS security_alerts_7d,
                   COALESCE(s.max_security_risk_7d,0) AS max_security_risk_7d,
                   COALESCE(a.failed_logins_1h,0) AS failed_logins_1h,
                   COALESCE(a.distinct_login_ips_24h,0) AS distinct_login_ips_24h,
                   b.last_booking_at, p.last_payment_at, s.last_security_at, a.last_auth_at,
                   d.details AS disposition_details
            FROM app_user u
            LEFT JOIN booking_stats b ON b.user_id=u.id
            LEFT JOIN payment_stats p ON p.user_id=u.id
            LEFT JOIN voucher_stats v ON v.user_id=u.id
            LEFT JOIN security_stats s ON s.user_id=u.id
            LEFT JOIN auth_stats a ON a.user_id=u.id
            LEFT JOIN LATERAL (
              SELECT al.details FROM audit_log al
              WHERE al.action='RISK_DISPOSITION_SET' AND al.entity_type='RISK_CUSTOMER' AND al.entity_id=u.id::text
              ORDER BY al.created_at DESC LIMIT 1
            ) d ON TRUE
            WHERE u.role='USER'
            ORDER BY u.created_at DESC
            """;
}
