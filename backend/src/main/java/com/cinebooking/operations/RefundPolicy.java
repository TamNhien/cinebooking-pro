package com.cinebooking.operations;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;

@Component
public class RefundPolicy {
    private final long fullRefundMinutes;
    private final long partialAutoMinutes;
    private final long minimumMinutes;
    private final BigDecimal partialAutoRate;
    private final BigDecimal manualRate;

    public RefundPolicy(
            @Value("${app.refund.full-refund-minutes:1440}") long fullRefundMinutes,
            @Value("${app.refund.partial-auto-minutes:360}") long partialAutoMinutes,
            @Value("${app.refund.minimum-minutes:120}") long minimumMinutes,
            @Value("${app.refund.partial-auto-rate:0.80}") BigDecimal partialAutoRate,
            @Value("${app.refund.manual-rate:0.50}") BigDecimal manualRate) {
        if (minimumMinutes < 0 || partialAutoMinutes < minimumMinutes || fullRefundMinutes < partialAutoMinutes) {
            throw new IllegalArgumentException("Invalid refund time thresholds");
        }
        this.fullRefundMinutes = fullRefundMinutes;
        this.partialAutoMinutes = partialAutoMinutes;
        this.minimumMinutes = minimumMinutes;
        this.partialAutoRate = validateRate(partialAutoRate, "partial-auto-rate");
        this.manualRate = validateRate(manualRate, "manual-rate");
    }

    public Quote quote(BigDecimal totalAmount, Instant showtimeStart, Instant now) {
        long minutes = Duration.between(now, showtimeStart).toMinutes();
        if (minutes < minimumMinutes) {
            return quote(totalAmount, BigDecimal.ZERO, "NON_REFUNDABLE", false, false, minutes,
                    "Không thể hoàn vé trong vòng " + minimumMinutes + " phút trước giờ chiếu.");
        }
        if (minutes >= fullRefundMinutes) {
            return quote(totalAmount, BigDecimal.ONE, "AUTO_FULL", true, true, minutes,
                    "Hoàn 100% vì yêu cầu đủ sớm trước giờ chiếu.");
        }
        if (minutes >= partialAutoMinutes) {
            int pct = partialAutoRate.multiply(BigDecimal.valueOf(100)).intValue();
            return quote(totalAmount, partialAutoRate, "AUTO_PARTIAL", true, true, minutes,
                    "Hoàn tự động " + pct + "% theo chính sách hủy sớm.");
        }
        int pct = manualRate.multiply(BigDecimal.valueOf(100)).intValue();
        return quote(totalAmount, manualRate, "MANUAL_PARTIAL", true, false, minutes,
                "Có thể hoàn " + pct + "% và cần quản trị viên xác nhận.");
    }

    private Quote quote(BigDecimal total, BigDecimal rate, String code, boolean refundable, boolean autoPolicy,
                        long minutes, String message) {
        BigDecimal safeTotal = total == null ? BigDecimal.ZERO : total.max(BigDecimal.ZERO);
        BigDecimal amount = safeTotal.multiply(rate).setScale(0, RoundingMode.DOWN);
        BigDecimal fee = safeTotal.subtract(amount).max(BigDecimal.ZERO).setScale(0, RoundingMode.DOWN);
        BigDecimal pct = rate.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.DOWN);
        return new Quote(refundable, code, pct, amount, fee, autoPolicy, minutes, message);
    }

    private BigDecimal validateRate(BigDecimal value, String name) {
        if (value == null || value.compareTo(BigDecimal.ZERO) < 0 || value.compareTo(BigDecimal.ONE) > 0) {
            throw new IllegalArgumentException(name + " must be between 0 and 1");
        }
        return value;
    }

    public record Quote(boolean refundable, String policyCode, BigDecimal ratePercent, BigDecimal refundAmount,
                        BigDecimal feeAmount, boolean autoPolicyEligible, long minutesBeforeShowtime, String message) {}
}
