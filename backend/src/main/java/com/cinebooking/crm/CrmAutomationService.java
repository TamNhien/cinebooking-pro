package com.cinebooking.crm;

import com.cinebooking.common.ApiException;
import com.cinebooking.commerce.VoucherRepository;
import com.cinebooking.domain.Voucher;
import com.cinebooking.notification.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

import static com.cinebooking.crm.CrmAutomationDtos.*;

@Service
public class CrmAutomationService {
    public static final String STRATEGY_VERSION = "V77-CRM-AUTOMATION-5";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Pattern CAMPAIGN_CODE = Pattern.compile("^[A-Z0-9_-]{3,12}$");
    private static final Set<String> PLAYBOOKS = Set.of(
            "WELCOME_FIRST_BOOKING",
            "ENGAGED_CROSS_SELL",
            "VIP_REWARD",
            "AT_RISK_WINBACK",
            "LAPSED_REACTIVATION"
    );
    private static final int PREVIEW_LIMIT = 20;
    private static final int FREQUENCY_CAP_7D = 2;
    private static final int COOLDOWN_HOURS = 72;
    private static final int MAX_RECIPIENTS_LIMIT = 5000;
    private static final List<String> EVIDENCE_POLICY = List.of(
            "REAL_OPERATIONAL_DATA_ONLY",
            "NO_SYNTHETIC_CUSTOMER_OR_BOOKING_DATA",
            "PROMOTION_OPT_OUT_RESPECTED",
            "CONTACTABILITY_CHANNEL_REQUIRED",
            "FREQUENCY_CAP_2_PER_7D",
            "PROMOTION_COOLDOWN_72H",
            "PREVIEW_BEFORE_EXECUTE",
            "MAX_RECIPIENTS_BLAST_RADIUS_GUARD",
            "OWNER_SCOPED_ONE_USE_VOUCHER",
            "IDEMPOTENT_CAMPAIGN_DELIVERY",
            "CRM_ASSISTED_BOOKING_IS_CORRELATION_NOT_CAUSATION",
            "NO_RAW_PERSONAL_DATA_IN_ADMIN_CRM_UI"
    );

    private final JdbcTemplate jdbc;
    private final VoucherRepository vouchers;
    private final NotificationService notifications;

    public CrmAutomationService(JdbcTemplate jdbc, VoucherRepository vouchers, NotificationService notifications) {
        this.jdbc = jdbc;
        this.vouchers = vouchers;
        this.notifications = notifications;
    }

    public CrmAutomationSummaryV77 summary(int requestedDays) {
        int days = bound(requestedDays, 7, 180);
        List<CustomerRaw> customers = customerBase();
        long contactable = customers.stream().filter(c -> suppressionReason(c) == null).count();
        Map<String, Long> suppressions = new LinkedHashMap<>();
        for (CustomerRaw customer : customers) {
            String reason = suppressionReason(customer);
            if (reason != null) suppressions.merge(reason, 1L, Long::sum);
        }

        List<CrmPlaybookV77> playbooks = orderedPlaybooks().stream().map(code -> {
            List<CustomerRaw> matched = customers.stream().filter(c -> matches(code, c)).toList();
            long ready = matched.stream().filter(c -> suppressionReason(c) == null).count();
            return playbook(code, matched.size(), ready);
        }).toList();

        List<CrmSuppressionMetricV77> suppressionMetrics = List.of(
                suppression("PROMOTION_OPT_OUT", suppressions),
                suppression("NO_ENABLED_CHANNEL", suppressions),
                suppression("FREQUENCY_CAP_7D", suppressions),
                suppression("COOLDOWN_72H", suppressions)
        );

        return new CrmAutomationSummaryV77(
                STRATEGY_VERSION,
                Instant.now(),
                FREQUENCY_CAP_7D,
                COOLDOWN_HOURS,
                customers.size(),
                contactable,
                customers.size() - contactable,
                playbooks,
                suppressionMetrics,
                outcome(days),
                EVIDENCE_POLICY
        );
    }

    public CrmAutomationPreviewV77 preview(CrmAutomationRequestV77 request) {
        CampaignSpec spec = validate(request, false);
        List<CustomerRaw> matched = audience(spec.playbookCode());
        long contactable = matched.stream().filter(c -> suppressionReason(c) == null).count();
        long suppressed = matched.size() - contactable;
        List<CrmAudienceMemberV77> sample = matched.stream().limit(PREVIEW_LIMIT).map(this::audienceDto).toList();
        boolean executable = contactable > 0 && contactable <= spec.maxRecipients();

        return new CrmAutomationPreviewV77(
                STRATEGY_VERSION,
                spec.campaignCode(),
                spec.playbookCode(),
                playbookLabel(spec.playbookCode()),
                matched.size(),
                contactable,
                suppressed,
                spec.maxRecipients(),
                executable,
                PREVIEW_LIMIT,
                sample,
                "Voucher owner_user_id theo từng khách, usage_limit=1, không hiển thị như voucher công khai.",
                "Chỉ gửi khi promotion_enabled=true và có ít nhất một kênh in-app/email/browser đang bật.",
                "Suppression áp dụng trước execute: opt-out, no-channel, tối đa 2 promotion/7 ngày, cooldown 72 giờ và maxRecipients."
        );
    }

    @Transactional
    public CrmAutomationExecutionV77 execute(CrmAutomationRequestV77 request) {
        CampaignSpec spec = validate(request, true);
        List<CustomerRaw> matched = audience(spec.playbookCode());
        List<CustomerRaw> contactable = matched.stream().filter(c -> suppressionReason(c) == null).toList();
        long suppressed = matched.size() - contactable.size();

        if (contactable.isEmpty()) throw bad("Không có khách contactable sau khi áp dụng CRM suppression policy");
        if (contactable.size() > spec.maxRecipients()) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Blast-radius guard: có " + contactable.size() + " khách contactable nhưng maxRecipients=" + spec.maxRecipients() + ". Hãy tăng giới hạn có chủ đích hoặc thu hẹp playbook.");
        }

        long created = 0;
        long reused = 0;
        long notified = 0;
        long skipped = 0;
        Instant now = Instant.now();

        for (CustomerRaw customer : contactable) {
            String voucherCode = voucherCode(spec.campaignCode(), customer.userId());
            Voucher voucher = vouchers.findByCodeIgnoreCase(voucherCode).orElse(null);
            if (voucher == null) {
                voucher = createVoucher(spec, customer.userId(), voucherCode, now);
                vouchers.save(voucher);
                created++;
            } else {
                validateExistingCampaignVoucher(voucher, spec, customer.userId());
                reused++;
            }

            String personalizedMessage = spec.message() + " Mã ưu đãi cá nhân của bạn: " + voucherCode + ".";
            boolean delivered = notifications.createOnce(
                    customer.userId(),
                    "PROMOTION_V77",
                    spec.title(),
                    personalizedMessage,
                    "/profile",
                    "CRM77:" + spec.campaignCode() + ":" + customer.userId()
            );
            if (delivered) notified++; else skipped++;
        }

        return new CrmAutomationExecutionV77(
                STRATEGY_VERSION,
                spec.campaignCode(),
                spec.playbookCode(),
                matched.size(),
                contactable.size(),
                suppressed,
                created,
                reused,
                notified,
                skipped,
                Instant.now()
        );
    }

    private List<CustomerRaw> audience(String playbookCode) {
        return customerBase().stream()
                .filter(c -> matches(playbookCode, c))
                .sorted(Comparator
                        .comparing((CustomerRaw c) -> suppressionReason(c) == null ? 0 : 1)
                        .thenComparing((CustomerRaw c) -> c.lastBookingDate() == null ? LocalDate.MIN : c.lastBookingDate(), Comparator.reverseOrder())
                        .thenComparing(CustomerRaw::lifetimeRevenue, Comparator.reverseOrder())
                        .thenComparing(CustomerRaw::userId))
                .toList();
    }

    private List<CustomerRaw> customerBase() {
        String sql = """
                with confirmed as (
                  select b.purchaser_user_id customer_id,
                         min(date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh')) first_booking_date,
                         max(date(b.confirmed_at at time zone 'Asia/Ho_Chi_Minh')) last_booking_date,
                         count(*) lifetime_bookings
                  from booking b
                  where b.status='CONFIRMED' and b.confirmed_at is not null
                  group by b.purchaser_user_id
                ), successful_payment_per_booking as (
                  select p.booking_id,max(p.amount) amount
                  from payment p
                  where p.status='SUCCESS' and p.paid_at is not null
                  group by p.booking_id
                ), paid as (
                  select b.purchaser_user_id customer_id,coalesce(sum(sp.amount),0) lifetime_revenue
                  from successful_payment_per_booking sp
                  join booking b on b.id=sp.booking_id
                  group by b.purchaser_user_id
                ), promo as (
                  select n.user_id,
                         count(*) filter (where n.created_at>=now()-interval '7 days') promotion_7d,
                         max(n.created_at) last_promotion_at
                  from user_notification n
                  where n.category='PROMOTION'
                  group by n.user_id
                )
                select u.id,u.email,u.created_at,u.membership_tier,
                       c.first_booking_date,c.last_booking_date,coalesce(c.lifetime_bookings,0) lifetime_bookings,
                       coalesce(p.lifetime_revenue,0) lifetime_revenue,
                       coalesce(np.promotion_enabled,true) promotion_enabled,
                       coalesce(np.in_app_enabled,true) in_app_enabled,
                       coalesce(np.email_enabled,false) email_enabled,
                       coalesce(np.browser_enabled,false) browser_enabled,
                       coalesce(pr.promotion_7d,0) promotion_7d,
                       pr.last_promotion_at
                from app_user u
                left join confirmed c on c.customer_id=u.id
                left join paid p on p.customer_id=u.id
                left join notification_preference np on np.user_id=u.id
                left join promo pr on pr.user_id=u.id
                where u.role='USER' and u.account_enabled=true
                order by u.created_at desc,u.id
                """;
        return jdbc.query(sql, (rs, rowNum) -> new CustomerRaw(
                rs.getObject("id", UUID.class),
                rs.getString("email"),
                toInstant(rs.getTimestamp("created_at")),
                rs.getString("membership_tier"),
                rs.getObject("first_booking_date", LocalDate.class),
                rs.getObject("last_booking_date", LocalDate.class),
                rs.getLong("lifetime_bookings"),
                money(rs.getBigDecimal("lifetime_revenue")),
                rs.getBoolean("promotion_enabled"),
                rs.getBoolean("in_app_enabled"),
                rs.getBoolean("email_enabled"),
                rs.getBoolean("browser_enabled"),
                rs.getLong("promotion_7d"),
                toNullableInstant(rs.getTimestamp("last_promotion_at"))
        ));
    }

    private CrmOutcomeV77 outcome(int days) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
        Map<String, Object> activity = jdbc.queryForMap("""
                select count(*) promotion_messages,
                       count(*) filter (where in_app_visible=true) in_app_visible_messages,
                       count(*) filter (where in_app_visible=true and read_at is not null) read_messages
                from user_notification
                where notification_type='PROMOTION_V77' and created_at>=?
                """, Timestamp.from(since));
        long messages = number(activity.get("promotion_messages"));
        long visible = number(activity.get("in_app_visible_messages"));
        long read = number(activity.get("read_messages"));
        BigDecimal readRate = visible == 0 ? BigDecimal.ZERO : BigDecimal.valueOf(read)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(visible), 2, RoundingMode.HALF_UP);

        Long assisted = jdbc.queryForObject("""
                select count(*) from booking b
                where b.status='CONFIRMED' and b.confirmed_at is not null and b.confirmed_at>=?
                  and exists (
                    select 1 from user_notification n
                    where n.user_id=b.purchaser_user_id
                      and n.notification_type='PROMOTION_V77'
                      and n.created_at<=b.confirmed_at
                      and n.created_at>=b.confirmed_at-interval '7 days'
                  )
                """, Long.class, Timestamp.from(since));

        BigDecimal assistedRevenue = jdbc.queryForObject("""
                with assisted_booking as (
                  select b.id
                  from booking b
                  where b.status='CONFIRMED' and b.confirmed_at is not null and b.confirmed_at>=?
                    and exists (
                      select 1 from user_notification n
                      where n.user_id=b.purchaser_user_id
                        and n.notification_type='PROMOTION_V77'
                        and n.created_at<=b.confirmed_at
                        and n.created_at>=b.confirmed_at-interval '7 days'
                    )
                ), successful_payment_per_booking as (
                  select p.booking_id,max(p.amount) amount
                  from payment p
                  where p.status='SUCCESS' and p.paid_at is not null
                  group by p.booking_id
                )
                select coalesce(sum(sp.amount),0)
                from assisted_booking ab
                join successful_payment_per_booking sp on sp.booking_id=ab.id
                """, BigDecimal.class, Timestamp.from(since));

        return new CrmOutcomeV77(days, messages, visible, read, readRate,
                assisted == null ? 0 : assisted,
                money(assistedRevenue));
    }

    private boolean matches(String playbook, CustomerRaw c) {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        long recency = recencyDays(c, today);
        long accountAge = Math.max(0, ChronoUnit.DAYS.between(c.createdAt().atZone(BUSINESS_ZONE).toLocalDate(), today));
        return switch (playbook) {
            case "WELCOME_FIRST_BOOKING" -> c.lifetimeBookings() == 0 && accountAge <= 30;
            case "ENGAGED_CROSS_SELL" -> c.lastBookingDate() != null && recency <= 30;
            case "VIP_REWARD" -> Set.of("GOLD", "DIAMOND").contains(normal(c.membershipTier()))
                    || c.lifetimeBookings() >= 4
                    || c.lifetimeRevenue().compareTo(new BigDecimal("1000000")) >= 0;
            case "AT_RISK_WINBACK" -> c.lastBookingDate() != null && recency >= 31 && recency <= 90;
            case "LAPSED_REACTIVATION" -> c.lastBookingDate() != null && recency > 90;
            default -> false;
        };
    }

    private String suppressionReason(CustomerRaw c) {
        if (!c.promotionEnabled()) return "PROMOTION_OPT_OUT";
        if (!c.inAppEnabled() && !c.emailEnabled() && !c.browserEnabled()) return "NO_ENABLED_CHANNEL";
        if (c.promotionNotifications7d() >= FREQUENCY_CAP_7D) return "FREQUENCY_CAP_7D";
        if (c.lastPromotionAt() != null && c.lastPromotionAt().isAfter(Instant.now().minus(COOLDOWN_HOURS, ChronoUnit.HOURS))) return "COOLDOWN_72H";
        return null;
    }

    private CampaignSpec validate(CrmAutomationRequestV77 request, boolean executing) {
        if (request == null) throw bad("Thiếu nội dung CRM automation");
        String campaignCode = normal(request.campaignCode());
        String playbookCode = normal(request.playbookCode());
        String title = clean(request.title());
        String message = clean(request.message());
        String discountType = normal(request.discountType());
        BigDecimal discountValue = request.discountValue();
        BigDecimal minOrder = request.minOrderAmount() == null ? BigDecimal.ZERO : request.minOrderAmount();
        BigDecimal maxDiscount = request.maxDiscount();
        int validityDays = request.validityDays();
        int maxRecipients = request.maxRecipients();

        if (!CAMPAIGN_CODE.matcher(campaignCode).matches()) throw bad("campaignCode chỉ gồm A-Z, 0-9, - hoặc _ và dài 3-12 ký tự");
        if (!PLAYBOOKS.contains(playbookCode)) throw bad("CRM playbook V77 không hợp lệ");
        if (title.length() < 3 || title.length() > 120) throw bad("Tiêu đề phải dài 3-120 ký tự");
        if (message.length() < 3 || message.length() > 500) throw bad("Nội dung phải dài 3-500 ký tự");
        if (!Set.of("PERCENT", "FIXED").contains(discountType)) throw bad("Loại giảm phải là PERCENT hoặc FIXED");
        if (discountValue == null || discountValue.compareTo(BigDecimal.ZERO) <= 0) throw bad("Mức giảm phải lớn hơn 0");
        if ("PERCENT".equals(discountType) && discountValue.compareTo(new BigDecimal("100")) > 0) throw bad("Mức giảm phần trăm không được vượt 100%");
        if (minOrder.compareTo(BigDecimal.ZERO) < 0) throw bad("Đơn tối thiểu không được âm");
        if (maxDiscount != null && maxDiscount.compareTo(BigDecimal.ZERO) < 0) throw bad("Giảm tối đa không được âm");
        if (validityDays < 1 || validityDays > 90) throw bad("Hiệu lực voucher phải từ 1 đến 90 ngày");
        if (maxRecipients < 1 || maxRecipients > MAX_RECIPIENTS_LIMIT) throw bad("maxRecipients phải từ 1 đến " + MAX_RECIPIENTS_LIMIT);
        if (executing && !Boolean.TRUE.equals(request.confirmed())) throw bad("Cần confirmed=true trước khi execute CRM automation");

        return new CampaignSpec(campaignCode, playbookCode, title, message, discountType, discountValue, minOrder, maxDiscount, validityDays, maxRecipients);
    }

    private Voucher createVoucher(CampaignSpec spec, UUID userId, String code, Instant now) {
        Voucher voucher = new Voucher();
        voucher.setOwnerUserId(userId);
        voucher.setCode(code);
        voucher.setName("V77 · " + spec.title());
        voucher.setDiscountType(spec.discountType());
        voucher.setDiscountValue(spec.discountValue());
        voucher.setMinOrderAmount(spec.minOrderAmount());
        voucher.setMaxDiscount(spec.maxDiscount());
        voucher.setStartsAt(now);
        voucher.setEndsAt(now.plus(spec.validityDays(), ChronoUnit.DAYS));
        voucher.setUsageLimit(1);
        voucher.setUsedCount(0);
        voucher.setActive(true);
        return voucher;
    }

    private void validateExistingCampaignVoucher(Voucher voucher, CampaignSpec spec, UUID userId) {
        boolean ownerMatches = userId.equals(voucher.getOwnerUserId());
        boolean configMatches = spec.discountType().equals(voucher.getDiscountType())
                && spec.discountValue().compareTo(voucher.getDiscountValue()) == 0
                && spec.minOrderAmount().compareTo(voucher.getMinOrderAmount()) == 0
                && sameMoney(spec.maxDiscount(), voucher.getMaxDiscount());
        if (!ownerMatches || !configMatches) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "campaignCode " + spec.campaignCode() + " đã tồn tại với cấu hình khác; hãy dùng campaignCode mới");
        }
    }

    private CrmAudienceMemberV77 audienceDto(CustomerRaw c) {
        String reason = suppressionReason(c);
        return new CrmAudienceMemberV77(
                c.userId().toString().substring(0, 8).toUpperCase(Locale.ROOT),
                maskEmail(c.email()),
                normal(c.membershipTier()),
                c.lastBookingDate(),
                recencyDays(c, LocalDate.now(BUSINESS_ZONE)),
                c.lifetimeBookings(),
                c.lifetimeRevenue(),
                c.promotionNotifications7d(),
                c.lastPromotionAt(),
                reason == null,
                reason
        );
    }

    private CrmPlaybookV77 playbook(String code, long eligible, long contactable) {
        return new CrmPlaybookV77(
                code,
                playbookLabel(code),
                playbookDefinition(code),
                recommendedAction(code),
                defaultDiscount(code),
                eligible,
                contactable,
                Math.max(0, eligible - contactable)
        );
    }

    private CrmSuppressionMetricV77 suppression(String reason, Map<String, Long> counts) {
        return new CrmSuppressionMetricV77(reason, counts.getOrDefault(reason, 0L));
    }

    private List<String> orderedPlaybooks() {
        return List.of("WELCOME_FIRST_BOOKING", "ENGAGED_CROSS_SELL", "VIP_REWARD", "AT_RISK_WINBACK", "LAPSED_REACTIVATION");
    }

    private String playbookLabel(String code) {
        return switch (code) {
            case "WELCOME_FIRST_BOOKING" -> "Kích hoạt booking đầu tiên";
            case "ENGAGED_CROSS_SELL" -> "Cross-sell khách đang tương tác";
            case "VIP_REWARD" -> "Tri ân VIP";
            case "AT_RISK_WINBACK" -> "Win-back khách có nguy cơ rời bỏ";
            case "LAPSED_REACTIVATION" -> "Tái kích hoạt khách ngủ đông";
            default -> code;
        };
    }

    private String playbookDefinition(String code) {
        return switch (code) {
            case "WELCOME_FIRST_BOOKING" -> "USER active, tài khoản <=30 ngày và chưa có booking CONFIRMED.";
            case "ENGAGED_CROSS_SELL" -> "Có booking CONFIRMED gần nhất trong 30 ngày.";
            case "VIP_REWARD" -> "GOLD/DIAMOND hoặc >=4 booking CONFIRMED hoặc realized revenue >=1.000.000đ.";
            case "AT_RISK_WINBACK" -> "Booking CONFIRMED gần nhất cách đây 31-90 ngày.";
            case "LAPSED_REACTIVATION" -> "Booking CONFIRMED gần nhất cách đây trên 90 ngày.";
            default -> code;
        };
    }

    private String recommendedAction(String code) {
        return switch (code) {
            case "WELCOME_FIRST_BOOKING" -> "Ưu đãi nhỏ, thời hạn ngắn để kích hoạt booking đầu tiên.";
            case "ENGAGED_CROSS_SELL" -> "Gợi ý quay lại sớm hoặc cross-sell ưu đãi theo hành vi gần đây.";
            case "VIP_REWARD" -> "Tri ân cá nhân hóa, ưu tiên giá trị thay vì gửi dày.";
            case "AT_RISK_WINBACK" -> "Win-back có kiểm soát trước khi khách chuyển sang lapsed.";
            case "LAPSED_REACTIVATION" -> "Ưu đãi tái kích hoạt mạnh hơn nhưng vẫn áp dụng frequency cap.";
            default -> code;
        };
    }

    private int defaultDiscount(String code) {
        return switch (code) {
            case "WELCOME_FIRST_BOOKING", "ENGAGED_CROSS_SELL" -> 10;
            case "AT_RISK_WINBACK" -> 15;
            case "VIP_REWARD", "LAPSED_REACTIVATION" -> 20;
            default -> 10;
        };
    }

    private long recencyDays(CustomerRaw c, LocalDate today) {
        return c.lastBookingDate() == null ? -1 : Math.max(0, ChronoUnit.DAYS.between(c.lastBookingDate(), today));
    }

    private String voucherCode(String campaignCode, UUID userId) {
        String compactId = userId.toString().replace("-", "").substring(0, 12).toUpperCase(Locale.ROOT);
        return "C77-" + campaignCode + "-" + compactId;
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String visible = local.isEmpty() ? "*" : local.substring(0, Math.min(2, local.length()));
        return visible + "***@" + parts[1];
    }

    private String normal(String value) { return value == null ? "" : value.trim().toUpperCase(Locale.ROOT); }
    private String clean(String value) { return value == null ? "" : value.trim(); }
    private int bound(int value, int min, int max) { return Math.max(min, Math.min(max, value)); }
    private BigDecimal money(BigDecimal value) { return value == null ? BigDecimal.ZERO.setScale(2) : value.setScale(2, RoundingMode.HALF_UP); }
    private boolean sameMoney(BigDecimal a, BigDecimal b) { return a == null ? b == null : b != null && a.compareTo(b) == 0; }
    private long number(Object value) { return value instanceof Number n ? n.longValue() : 0L; }
    private Instant toInstant(Timestamp value) { return value == null ? Instant.EPOCH : value.toInstant(); }
    private Instant toNullableInstant(Timestamp value) { return value == null ? null : value.toInstant(); }
    private ApiException bad(String message) { return new ApiException(HttpStatus.BAD_REQUEST, message); }

    private record CustomerRaw(
            UUID userId,
            String email,
            Instant createdAt,
            String membershipTier,
            LocalDate firstBookingDate,
            LocalDate lastBookingDate,
            long lifetimeBookings,
            BigDecimal lifetimeRevenue,
            boolean promotionEnabled,
            boolean inAppEnabled,
            boolean emailEnabled,
            boolean browserEnabled,
            long promotionNotifications7d,
            Instant lastPromotionAt
    ) {}

    private record CampaignSpec(
            String campaignCode,
            String playbookCode,
            String title,
            String message,
            String discountType,
            BigDecimal discountValue,
            BigDecimal minOrderAmount,
            BigDecimal maxDiscount,
            int validityDays,
            int maxRecipients
    ) {}
}
