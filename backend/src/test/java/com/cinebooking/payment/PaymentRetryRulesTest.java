package com.cinebooking.payment;

import com.cinebooking.domain.PaymentStatus;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import static org.assertj.core.api.Assertions.assertThat;

class PaymentRetryRulesTest {
    @Test void pendingCanBeCancelled(){assertThat(PaymentRetryRules.canCancel(PaymentStatus.PENDING)).isTrue();}
    @Test void failedCanRetryBeforeBookingExpiry(){assertThat(PaymentRetryRules.canRetry(PaymentStatus.FAILED,Instant.now().plusSeconds(60),Instant.now())).isTrue();}
    @Test void cancelledCanRetryBeforeBookingExpiry(){assertThat(PaymentRetryRules.canRetry(PaymentStatus.CANCELLED,Instant.now().plusSeconds(60),Instant.now())).isTrue();}
    @Test void reviewCannotRetryBecauseChargeMayHaveSucceeded(){assertThat(PaymentRetryRules.canRetry(PaymentStatus.REVIEW,Instant.now().plusSeconds(60),Instant.now())).isFalse();}
    @Test void expiredBookingCannotRetry(){assertThat(PaymentRetryRules.canRetry(PaymentStatus.FAILED,Instant.now().minusSeconds(1),Instant.now())).isFalse();}
}
