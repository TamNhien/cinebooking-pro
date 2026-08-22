package com.cinebooking.security;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SecurityRiskRulesTest {
    @Test void credentialAttackIsHighRisk(){assertThat(SecurityRiskRules.score("CREDENTIAL_ATTACK")).isEqualTo(80);assertThat(SecurityRiskRules.severity("CREDENTIAL_ATTACK")).isEqualTo("HIGH");assertThat(SecurityRiskRules.highRisk("CREDENTIAL_ATTACK")).isTrue();}
    @Test void passwordResetIsHighRisk(){assertThat(SecurityRiskRules.score("PASSWORD_RESET")).isEqualTo(75);assertThat(SecurityRiskRules.severity("PASSWORD_RESET")).isEqualTo("HIGH");}
    @Test void newDeviceIsMediumRisk(){assertThat(SecurityRiskRules.score("NEW_DEVICE")).isEqualTo(45);assertThat(SecurityRiskRules.severity("NEW_DEVICE")).isEqualTo("MEDIUM");}
    @Test void unknownEventFallsBackToLow(){assertThat(SecurityRiskRules.score("UNKNOWN")).isEqualTo(20);assertThat(SecurityRiskRules.severity("UNKNOWN")).isEqualTo("LOW");}
}
