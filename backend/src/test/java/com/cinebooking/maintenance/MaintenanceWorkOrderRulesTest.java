package com.cinebooking.maintenance;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class MaintenanceWorkOrderRulesTest {
    @Test void openCanStartBlockOrCancel(){
        assertThat(MaintenanceWorkOrderRules.canTransition("OPEN","IN_PROGRESS")).isTrue();
        assertThat(MaintenanceWorkOrderRules.canTransition("OPEN","BLOCKED")).isTrue();
        assertThat(MaintenanceWorkOrderRules.canTransition("OPEN","CANCELLED")).isTrue();
        assertThat(MaintenanceWorkOrderRules.canTransition("OPEN","RESOLVED")).isFalse();
    }
    @Test void inProgressCanResolveAndBlockedCanResume(){
        assertThat(MaintenanceWorkOrderRules.canTransition("IN_PROGRESS","RESOLVED")).isTrue();
        assertThat(MaintenanceWorkOrderRules.canTransition("IN_PROGRESS","BLOCKED")).isTrue();
        assertThat(MaintenanceWorkOrderRules.canTransition("BLOCKED","IN_PROGRESS")).isTrue();
        assertThat(MaintenanceWorkOrderRules.canTransition("BLOCKED","RESOLVED")).isFalse();
    }
    @Test void terminalStatesAreImmutable(){
        assertThat(MaintenanceWorkOrderRules.canTransition("RESOLVED","OPEN")).isFalse();
        assertThat(MaintenanceWorkOrderRules.canTransition("CANCELLED","OPEN")).isFalse();
        assertThat(MaintenanceWorkOrderRules.isOpen("RESOLVED")).isFalse();
        assertThat(MaintenanceWorkOrderRules.isOpen("CANCELLED")).isFalse();
    }
    @Test void openStatusSetMatchesSlaQueries(){
        assertThat(MaintenanceWorkOrderRules.openStatuses()).containsExactlyInAnyOrder("OPEN","IN_PROGRESS","BLOCKED");
    }
}
