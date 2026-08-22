package com.cinebooking.support;
import org.junit.jupiter.api.Test;
import java.time.Duration;
import static org.assertj.core.api.Assertions.assertThat;
class SupportCaseRulesTest {
    @Test void lifecycleGuardsTerminalClosed(){
        assertThat(SupportCaseRules.canTransition("OPEN","IN_PROGRESS")).isTrue();
        assertThat(SupportCaseRules.canTransition("IN_PROGRESS","WAITING_CUSTOMER")).isTrue();
        assertThat(SupportCaseRules.canTransition("WAITING_CUSTOMER","RESOLVED")).isTrue();
        assertThat(SupportCaseRules.canTransition("RESOLVED","IN_PROGRESS")).isTrue();
        assertThat(SupportCaseRules.canTransition("CLOSED","IN_PROGRESS")).isFalse();
    }
    @Test void slaMatchesPriority(){
        assertThat(SupportCaseRules.sla("CRITICAL")).isEqualTo(Duration.ofHours(4));
        assertThat(SupportCaseRules.sla("HIGH")).isEqualTo(Duration.ofHours(24));
        assertThat(SupportCaseRules.sla("MEDIUM")).isEqualTo(Duration.ofHours(48));
        assertThat(SupportCaseRules.sla("LOW")).isEqualTo(Duration.ofHours(72));
    }
    @Test void openStatusSetExcludesResolvedAndClosed(){
        assertThat(SupportCaseRules.openStatuses()).containsExactlyInAnyOrder("OPEN","IN_PROGRESS","WAITING_CUSTOMER");
        assertThat(SupportCaseRules.isOpen("RESOLVED")).isFalse();
        assertThat(SupportCaseRules.isOpen("CLOSED")).isFalse();
    }
}
