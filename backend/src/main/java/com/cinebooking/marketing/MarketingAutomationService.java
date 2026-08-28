package com.cinebooking.marketing;

import com.cinebooking.common.ApiException;
import com.cinebooking.commerce.VoucherRepository;
import com.cinebooking.domain.Voucher;
import com.cinebooking.notification.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
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

import static com.cinebooking.marketing.MarketingAutomationDtos.*;

@Service
public class MarketingAutomationService {
    public static final String STRATEGY_VERSION = "V64-CRM-AUTOMATION-4";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Pattern CAMPAIGN_CODE = Pattern.compile("^[A-Z0-9_-]{3,12}$");
    private static final Set<String> SEGMENTS = Set.of(
            "ALL_ELIGIBLE", "NEW_30D", "ENGAGED_30D", "VIP",
            "AT_RISK_31_90D", "LAPSED_90D_PLUS", "PROSPECT_NO_BOOKING"
    );
    private static final int PREVIEW_LIMIT = 20;

    private final JdbcTemplate jdbc;
    private final VoucherRepository vouchers;
    private final NotificationService notifications;

    public MarketingAutomationService(
            JdbcTemplate jdbc,
            VoucherRepository vouchers,
            NotificationService notifications
    ) {
        this.jdbc = jdbc;
        this.vouchers = vouchers;
        this.notifications = notifications;
    }

    public MarketingOverview overview() {
        List<CustomerRaw> customers = customerBase();
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String code : orderedSegments()) {
            counts.put(code, customers.stream().filter(c -> matches(code, c)).count());
        }
        return new MarketingOverview(
                STRATEGY_VERSION,
                Instant.now(),
                customers.size(),
                List.of(
                        segment("ALL_ELIGIBLE", "Toàn bộ khách đủ điều kiện", "Tài khoản USER đang hoạt động; vẫn tôn trọng opt-out khuyến mãi khi gửi thông báo.", counts, "Thông báo chiến dịch chung có kiểm soát.", 10),
                        segment("NEW_30D", "Khách mới 30 ngày", "Tài khoản được tạo trong 30 ngày gần nhất.", counts, "Welcome / kích hoạt lần mua đầu tiên.", 15),
                        segment("ENGAGED_30D", "Đang tương tác 30 ngày", "Có booking CONFIRMED trong 30 ngày gần nhất.", counts, "Cross-sell hoặc ưu đãi quay lại sớm.", 10),
                        segment("VIP", "VIP giá trị cao", "GOLD/DIAMOND hoặc >=4 booking CONFIRMED hoặc doanh thu thanh toán thành công >=1.000.000đ.", counts, "Ưu đãi tri ân cá nhân hóa, voucher 1 lần dùng.", 20),
                        segment("AT_RISK_31_90D", "Có nguy cơ rời bỏ", "Booking CONFIRMED gần nhất cách đây 31-90 ngày.", counts, "Win-back nhẹ trước khi khách ngủ đông.", 15),
                        segment("LAPSED_90D_PLUS", "Ngủ đông >90 ngày", "Booking CONFIRMED gần nhất cách đây trên 90 ngày.", counts, "Reactivation với ưu đãi mạnh hơn và thời hạn rõ ràng.", 20),
                        segment("PROSPECT_NO_BOOKING", "Đã đăng ký, chưa mua", "Tài khoản USER đang hoạt động nhưng chưa có booking CONFIRMED.", counts, "Kích hoạt booking đầu tiên.", 15)
                )
        );
    }

    public CampaignPreview preview(CampaignRequest request) {
        CampaignSpec spec = validate(request, false);
        List<CustomerRaw> matched = audience(spec.segmentCode());
        List<AudienceMember> sample = matched.stream().limit(PREVIEW_LIMIT).map(this::audienceDto).toList();
        return new CampaignPreview(
                STRATEGY_VERSION,
                spec.campaignCode(),
                spec.segmentCode(),
                segmentLabel(spec.segmentCode()),
                matched.size(),
                PREVIEW_LIMIT,
                sample,
                "Voucher cá nhân owner_user_id, 1 lượt dùng, không xuất hiện trong danh sách voucher công khai.",
                "PROMOTION qua in-app/email/browser theo tùy chọn của từng tài khoản; opt-out promotion luôn được tôn trọng."
        );
    }

    @Transactional
    public CampaignLaunchResult launch(CampaignRequest request) {
        CampaignSpec spec = validate(request, true);
        List<CustomerRaw> matched = audience(spec.segmentCode());
        long created = 0;
        long reused = 0;
        long notified = 0;
        long skipped = 0;
        Instant now = Instant.now();

        for (CustomerRaw customer : matched) {
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
                    "PROMOTION_V64",
                    spec.title(),
                    personalizedMessage,
                    "/profile",
                    "MKT64:" + spec.campaignCode() + ":" + customer.userId()
            );
            if (delivered) notified++; else skipped++;
        }

        return new CampaignLaunchResult(
                STRATEGY_VERSION,
                spec.campaignCode(),
                spec.segmentCode(),
                matched.size(),
                created,
                reused,
                notified,
                skipped,
                Instant.now()
        );
    }

    private List<CustomerRaw> audience(String segmentCode) {
        return customerBase().stream()
                .filter(c -> matches(segmentCode, c))
                .sorted(Comparator
                        .comparing((CustomerRaw c) -> c.lastBookingDate() == null ? LocalDate.MIN : c.lastBookingDate()).reversed()
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
                ), paid as (
                  select b.purchaser_user_id customer_id,coalesce(sum(p.amount),0) lifetime_revenue
                  from payment p
                  join booking b on b.id=p.booking_id
                  where p.status='SUCCESS' and p.paid_at is not null
                  group by b.purchaser_user_id
                )
                select u.id,u.full_name,u.email,u.created_at,u.membership_tier,
                       c.first_booking_date,c.last_booking_date,coalesce(c.lifetime_bookings,0) lifetime_bookings,
                       coalesce(p.lifetime_revenue,0) lifetime_revenue
                from app_user u
                left join confirmed c on c.customer_id=u.id
                left join paid p on p.customer_id=u.id
                where u.role='USER' and u.account_enabled=true
                order by u.created_at desc,u.id
                """;
        return jdbc.query(sql, (rs, rowNum) -> new CustomerRaw(
                rs.getObject("id", UUID.class),
                rs.getString("full_name"),
                rs.getString("email"),
                toInstant(rs.getTimestamp("created_at")),
                rs.getString("membership_tier"),
                rs.getObject("first_booking_date", LocalDate.class),
                rs.getObject("last_booking_date", LocalDate.class),
                rs.getLong("lifetime_bookings"),
                money(rs.getBigDecimal("lifetime_revenue"))
        ));
    }

    private boolean matches(String segment, CustomerRaw c) {
        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        long recency = recencyDays(c, today);
        long accountAge = Math.max(0, ChronoUnit.DAYS.between(c.createdAt().atZone(BUSINESS_ZONE).toLocalDate(), today));
        return switch (segment) {
            case "ALL_ELIGIBLE" -> true;
            case "NEW_30D" -> accountAge <= 30;
            case "ENGAGED_30D" -> c.lastBookingDate() != null && recency <= 30;
            case "VIP" -> Set.of("GOLD", "DIAMOND").contains(normal(c.membershipTier()))
                    || c.lifetimeBookings() >= 4
                    || c.lifetimeRevenue().compareTo(new BigDecimal("1000000")) >= 0;
            case "AT_RISK_31_90D" -> c.lastBookingDate() != null && recency >= 31 && recency <= 90;
            case "LAPSED_90D_PLUS" -> c.lastBookingDate() != null && recency > 90;
            case "PROSPECT_NO_BOOKING" -> c.lifetimeBookings() == 0;
            default -> false;
        };
    }

    private CampaignSpec validate(CampaignRequest request, boolean launching) {
        if (request == null) throw bad("Thiếu nội dung chiến dịch");
        String campaignCode = normal(request.campaignCode());
        String segmentCode = normal(request.segmentCode());
        String title = clean(request.title());
        String message = clean(request.message());
        String discountType = normal(request.discountType());
        BigDecimal discountValue = request.discountValue();
        BigDecimal minOrder = request.minOrderAmount() == null ? BigDecimal.ZERO : request.minOrderAmount();
        BigDecimal maxDiscount = request.maxDiscount();
        int validityDays = request.validityDays();

        if (!CAMPAIGN_CODE.matcher(campaignCode).matches()) throw bad("Mã chiến dịch chỉ gồm A-Z, 0-9, - hoặc _ và dài 3-12 ký tự");
        if (!SEGMENTS.contains(segmentCode)) throw bad("Segment V64 không hợp lệ");
        if (title.length() < 3 || title.length() > 120) throw bad("Tiêu đề chiến dịch phải dài 3-120 ký tự");
        if (message.length() < 3 || message.length() > 500) throw bad("Nội dung chiến dịch phải dài 3-500 ký tự");
        if (!Set.of("PERCENT", "FIXED").contains(discountType)) throw bad("Loại giảm phải là PERCENT hoặc FIXED");
        if (discountValue == null || discountValue.compareTo(BigDecimal.ZERO) <= 0) throw bad("Mức giảm phải lớn hơn 0");
        if ("PERCENT".equals(discountType) && discountValue.compareTo(new BigDecimal("100")) > 0) throw bad("Mức giảm phần trăm không được vượt 100%");
        if (minOrder.compareTo(BigDecimal.ZERO) < 0) throw bad("Đơn tối thiểu không được âm");
        if (maxDiscount != null && maxDiscount.compareTo(BigDecimal.ZERO) < 0) throw bad("Giảm tối đa không được âm");
        if (validityDays < 1 || validityDays > 90) throw bad("Hiệu lực voucher phải từ 1 đến 90 ngày");
        if (launching && !Boolean.TRUE.equals(request.confirmed())) throw bad("Cần xác nhận confirmed=true trước khi phát hành chiến dịch");

        return new CampaignSpec(campaignCode, segmentCode, title, message, discountType, discountValue, minOrder, maxDiscount, validityDays);
    }

    private Voucher createVoucher(CampaignSpec spec, UUID userId, String code, Instant now) {
        Voucher voucher = new Voucher();
        voucher.setOwnerUserId(userId);
        voucher.setCode(code);
        voucher.setName("V64 · " + spec.title());
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
            throw new ApiException(HttpStatus.CONFLICT, "Mã chiến dịch " + spec.campaignCode() + " đã tồn tại với cấu hình khác; hãy dùng campaignCode mới");
        }
    }

    private MarketingSegment segment(String code, String label, String definition, Map<String, Long> counts, String action, int discount) {
        return new MarketingSegment(code, label, definition, counts.getOrDefault(code, 0L), action, discount);
    }

    private AudienceMember audienceDto(CustomerRaw c) {
        return new AudienceMember(
                c.userId().toString().substring(0, 8).toUpperCase(Locale.ROOT),
                c.fullName(),
                maskEmail(c.email()),
                normal(c.membershipTier()),
                c.lastBookingDate(),
                recencyDays(c, LocalDate.now(BUSINESS_ZONE)),
                c.lifetimeBookings(),
                c.lifetimeRevenue()
        );
    }

    private long recencyDays(CustomerRaw c, LocalDate today) {
        return c.lastBookingDate() == null ? -1 : Math.max(0, ChronoUnit.DAYS.between(c.lastBookingDate(), today));
    }

    private String voucherCode(String campaignCode, UUID userId) {
        String compactId = userId.toString().replace("-", "").substring(0, 12).toUpperCase(Locale.ROOT);
        return "M64-" + campaignCode + "-" + compactId;
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@", 2);
        String local = parts[0];
        String visible = local.length() <= 2 ? local.substring(0, 1) : local.substring(0, 2);
        return visible + "***@" + parts[1];
    }

    private List<String> orderedSegments() {
        return List.of("ALL_ELIGIBLE", "NEW_30D", "ENGAGED_30D", "VIP", "AT_RISK_31_90D", "LAPSED_90D_PLUS", "PROSPECT_NO_BOOKING");
    }

    private String segmentLabel(String code) {
        return switch (code) {
            case "ALL_ELIGIBLE" -> "Toàn bộ khách đủ điều kiện";
            case "NEW_30D" -> "Khách mới 30 ngày";
            case "ENGAGED_30D" -> "Đang tương tác 30 ngày";
            case "VIP" -> "VIP giá trị cao";
            case "AT_RISK_31_90D" -> "Có nguy cơ rời bỏ";
            case "LAPSED_90D_PLUS" -> "Ngủ đông >90 ngày";
            case "PROSPECT_NO_BOOKING" -> "Đã đăng ký, chưa mua";
            default -> code;
        };
    }

    private String normal(String value) { return value == null ? "" : value.trim().toUpperCase(Locale.ROOT); }
    private String clean(String value) { return value == null ? "" : value.trim(); }
    private BigDecimal money(BigDecimal value) { return value == null ? BigDecimal.ZERO : value.setScale(2); }
    private boolean sameMoney(BigDecimal a, BigDecimal b) { return a == null ? b == null : b != null && a.compareTo(b) == 0; }
    private Instant toInstant(Timestamp value) { return value == null ? Instant.EPOCH : value.toInstant(); }
    private ApiException bad(String message) { return new ApiException(HttpStatus.BAD_REQUEST, message); }

    private record CustomerRaw(
            UUID userId,
            String fullName,
            String email,
            Instant createdAt,
            String membershipTier,
            LocalDate firstBookingDate,
            LocalDate lastBookingDate,
            long lifetimeBookings,
            BigDecimal lifetimeRevenue
    ) {}

    private record CampaignSpec(
            String campaignCode,
            String segmentCode,
            String title,
            String message,
            String discountType,
            BigDecimal discountValue,
            BigDecimal minOrderAmount,
            BigDecimal maxDiscount,
            int validityDays
    ) {}
}
