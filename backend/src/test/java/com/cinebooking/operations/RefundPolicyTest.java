package com.cinebooking.operations;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class RefundPolicyTest {
    private final RefundPolicy policy = new RefundPolicy(1440, 360, 120, new BigDecimal("0.80"), new BigDecimal("0.50"));
    private final Instant now = Instant.parse("2026-08-20T00:00:00Z");

    @Test
    void appliesFullAutomaticRefundAtLeast24HoursBeforeShowtime() {
        var q = policy.quote(new BigDecimal("100000"), now.plusSeconds(48 * 3600), now);
        assertThat(q.refundable()).isTrue();
        assertThat(q.policyCode()).isEqualTo("AUTO_FULL");
        assertThat(q.ratePercent()).isEqualByComparingTo("100");
        assertThat(q.refundAmount()).isEqualByComparingTo("100000");
        assertThat(q.feeAmount()).isZero();
        assertThat(q.autoPolicyEligible()).isTrue();
    }

    @Test
    void appliesEightyPercentAutomaticPolicyBetween6And24Hours() {
        var q = policy.quote(new BigDecimal("100000"), now.plusSeconds(12 * 3600), now);
        assertThat(q.policyCode()).isEqualTo("AUTO_PARTIAL");
        assertThat(q.refundAmount()).isEqualByComparingTo("80000");
        assertThat(q.feeAmount()).isEqualByComparingTo("20000");
        assertThat(q.autoPolicyEligible()).isTrue();
    }

    @Test
    void routesTwoToSixHourRefundToManualReview() {
        var q = policy.quote(new BigDecimal("100000"), now.plusSeconds(3 * 3600), now);
        assertThat(q.policyCode()).isEqualTo("MANUAL_PARTIAL");
        assertThat(q.refundAmount()).isEqualByComparingTo("50000");
        assertThat(q.autoPolicyEligible()).isFalse();
    }

    @Test
    void rejectsRefundInsideTwoHourCutoff() {
        var q = policy.quote(new BigDecimal("100000"), now.plusSeconds(60 * 60), now);
        assertThat(q.refundable()).isFalse();
        assertThat(q.policyCode()).isEqualTo("NON_REFUNDABLE");
        assertThat(q.refundAmount()).isZero();
    }
}
