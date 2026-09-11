package com.cinebooking.security;

import com.cinebooking.auth.AuthSessionRepository;
import com.cinebooking.auth.ClientDeviceDetector;
import com.cinebooking.domain.AuthSession;
import com.cinebooking.domain.SecurityAlert;
import com.cinebooking.notification.NotificationService;
import com.cinebooking.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SecurityProtectionServiceTest {
    private static final String UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36";
    private static final String LEGACY_BRAVE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.7778.96 Safari/537.36";
    private static final String IP = "172.24.0.1";

    @Test
    void braveSyncRepairsOnlyRecentLinkedLegacyNewDeviceAlert() {
        UUID userId = UUID.randomUUID();
        UUID currentId = UUID.randomUUID();
        UUID legacyId = UUID.randomUUID();

        TrustedDeviceRepository devices = mock(TrustedDeviceRepository.class);
        SecurityAlertRepository alerts = mock(SecurityAlertRepository.class);
        AuthSessionRepository sessions = mock(AuthSessionRepository.class);
        UserRepository users = mock(UserRepository.class);
        NotificationService notifications = mock(NotificationService.class);
        HttpServletRequest request = mock(HttpServletRequest.class);

        AuthSession current = session(currentId, userId, "Brave · Windows", Instant.now().minus(5, ChronoUnit.MINUTES));
        AuthSession legacy = session(legacyId, userId, "Chrome · Windows", Instant.now().minus(2, ChronoUnit.HOURS));
        SecurityAlert alert = new SecurityAlert();
        alert.setUserId(userId);
        alert.setEventType("NEW_DEVICE");
        alert.setDeviceName("Chrome · Windows");
        alert.setRelatedSessionId(legacyId);

        when(sessions.findById(currentId)).thenReturn(Optional.of(current));
        when(sessions.findTop50ByUserIdOrderByLastSeenAtDesc(userId)).thenReturn(List.of(current, legacy));
        when(devices.findByUserIdAndDeviceFingerprint(eq(userId), anyString())).thenReturn(Optional.empty());
        when(alerts.findByRelatedSessionId(currentId)).thenReturn(List.of());
        when(alerts.findByRelatedSessionId(legacyId)).thenReturn(List.of(alert));
        braveRequest(request);

        SecurityProtectionService service = new SecurityProtectionService(devices, alerts, sessions, users, notifications);
        var result = service.syncCurrentClient(userId, currentId, request);

        assertThat(result.browser()).isEqualTo("Brave");
        assertThat(result.deviceName()).isEqualTo("Brave · Windows");
        assertThat(legacy.getDeviceName()).isEqualTo("Brave · Windows");
        assertThat(alert.getDeviceName()).isEqualTo("Brave · Windows");
        verify(sessions).save(legacy);
        verify(alerts).save(alert);
    }

    @Test
    void braveSyncDoesNotRewriteLegacyChromeAlertOutsideTwentyFourHourWindow() {
        UUID userId = UUID.randomUUID();
        UUID currentId = UUID.randomUUID();
        UUID oldId = UUID.randomUUID();

        TrustedDeviceRepository devices = mock(TrustedDeviceRepository.class);
        SecurityAlertRepository alerts = mock(SecurityAlertRepository.class);
        AuthSessionRepository sessions = mock(AuthSessionRepository.class);
        UserRepository users = mock(UserRepository.class);
        NotificationService notifications = mock(NotificationService.class);
        HttpServletRequest request = mock(HttpServletRequest.class);

        AuthSession current = session(currentId, userId, "Brave · Windows", Instant.now().minus(5, ChronoUnit.MINUTES));
        AuthSession oldChrome = session(oldId, userId, "Chrome · Windows", Instant.now().minus(25, ChronoUnit.HOURS));
        SecurityAlert oldAlert = new SecurityAlert();
        oldAlert.setUserId(userId);
        oldAlert.setEventType("NEW_DEVICE");
        oldAlert.setDeviceName("Chrome · Windows");
        oldAlert.setRelatedSessionId(oldId);

        when(sessions.findById(currentId)).thenReturn(Optional.of(current));
        when(sessions.findTop50ByUserIdOrderByLastSeenAtDesc(userId)).thenReturn(List.of(current, oldChrome));
        when(devices.findByUserIdAndDeviceFingerprint(eq(userId), anyString())).thenReturn(Optional.empty());
        when(alerts.findByRelatedSessionId(currentId)).thenReturn(List.of());
        braveRequest(request);

        SecurityProtectionService service = new SecurityProtectionService(devices, alerts, sessions, users, notifications);
        service.syncCurrentClient(userId, currentId, request);

        assertThat(oldChrome.getDeviceName()).isEqualTo("Chrome · Windows");
        assertThat(oldAlert.getDeviceName()).isEqualTo("Chrome · Windows");
        verify(alerts, never()).findByRelatedSessionId(oldId);
        verify(sessions, never()).save(oldChrome);
        verify(alerts, never()).save(oldAlert);
    }


    @Test
    void braveSyncRepairsHistoricalChromeAlertFromLaterPositiveBraveFingerprintEvidence() {
        UUID userId = UUID.randomUUID();
        UUID currentId = UUID.randomUUID();
        UUID evidenceId = UUID.randomUUID();
        UUID legacyId = UUID.randomUUID();
        Instant now = Instant.now();

        TrustedDeviceRepository devices = mock(TrustedDeviceRepository.class);
        SecurityAlertRepository alerts = mock(SecurityAlertRepository.class);
        AuthSessionRepository sessions = mock(AuthSessionRepository.class);
        UserRepository users = mock(UserRepository.class);
        NotificationService notifications = mock(NotificationService.class);
        HttpServletRequest request = mock(HttpServletRequest.class);

        AuthSession current = session(currentId, userId, UA, IP, "Brave · Windows", now.minus(5, ChronoUnit.MINUTES));
        AuthSession evidence = session(evidenceId, userId, LEGACY_BRAVE_UA, IP, "Brave · Windows", now.minus(30, ChronoUnit.MINUTES));
        AuthSession legacy = session(legacyId, userId, LEGACY_BRAVE_UA, IP, "Chrome · Windows", now.minus(12, ChronoUnit.HOURS));
        SecurityAlert alert = new SecurityAlert();
        alert.setUserId(userId);
        alert.setEventType("NEW_DEVICE");
        alert.setDeviceName("Chrome · Windows");
        alert.setIpAddress(IP);
        alert.setRelatedSessionId(legacyId);

        when(sessions.findById(currentId)).thenReturn(Optional.of(current));
        when(sessions.findTop50ByUserIdOrderByLastSeenAtDesc(userId)).thenReturn(List.of(current, evidence, legacy));
        when(devices.findByUserIdAndDeviceFingerprint(eq(userId), anyString())).thenReturn(Optional.empty());
        when(alerts.findByRelatedSessionId(currentId)).thenReturn(List.of());
        when(alerts.findByRelatedSessionId(legacyId)).thenReturn(List.of(alert));
        braveRequest(request);

        SecurityProtectionService service = new SecurityProtectionService(devices, alerts, sessions, users, notifications);
        service.syncCurrentClient(userId, currentId, request);

        assertThat(legacy.getDeviceName()).isEqualTo("Brave · Windows");
        assertThat(alert.getDeviceName()).isEqualTo("Brave · Windows");
        verify(sessions).save(legacy);
        verify(alerts).save(alert);
    }

    @Test
    void historicalBraveEvidenceDoesNotRewriteChromeSessionCreatedAfterEvidence() {
        UUID userId = UUID.randomUUID();
        UUID currentId = UUID.randomUUID();
        UUID evidenceId = UUID.randomUUID();
        UUID chromeId = UUID.randomUUID();
        Instant now = Instant.now();

        TrustedDeviceRepository devices = mock(TrustedDeviceRepository.class);
        SecurityAlertRepository alerts = mock(SecurityAlertRepository.class);
        AuthSessionRepository sessions = mock(AuthSessionRepository.class);
        UserRepository users = mock(UserRepository.class);
        NotificationService notifications = mock(NotificationService.class);
        HttpServletRequest request = mock(HttpServletRequest.class);

        AuthSession current = session(currentId, userId, UA, IP, "Brave · Windows", now.minus(5, ChronoUnit.MINUTES));
        AuthSession evidence = session(evidenceId, userId, LEGACY_BRAVE_UA, IP, "Brave · Windows", now.minus(12, ChronoUnit.HOURS));
        AuthSession laterChrome = session(chromeId, userId, LEGACY_BRAVE_UA, IP, "Chrome · Windows", now.minus(1, ChronoUnit.HOURS));
        SecurityAlert alert = new SecurityAlert();
        alert.setUserId(userId);
        alert.setEventType("NEW_DEVICE");
        alert.setDeviceName("Chrome · Windows");
        alert.setIpAddress(IP);
        alert.setRelatedSessionId(chromeId);

        when(sessions.findById(currentId)).thenReturn(Optional.of(current));
        when(sessions.findTop50ByUserIdOrderByLastSeenAtDesc(userId)).thenReturn(List.of(current, laterChrome, evidence));
        when(devices.findByUserIdAndDeviceFingerprint(eq(userId), anyString())).thenReturn(Optional.empty());
        when(alerts.findByRelatedSessionId(currentId)).thenReturn(List.of());
        braveRequest(request);

        SecurityProtectionService service = new SecurityProtectionService(devices, alerts, sessions, users, notifications);
        service.syncCurrentClient(userId, currentId, request);

        assertThat(laterChrome.getDeviceName()).isEqualTo("Chrome · Windows");
        assertThat(alert.getDeviceName()).isEqualTo("Chrome · Windows");
        verify(alerts, never()).findByRelatedSessionId(chromeId);
        verify(sessions, never()).save(laterChrome);
        verify(alerts, never()).save(alert);
    }

    @Test
    void historicalBraveEvidenceRequiresExactIpMatch() {
        UUID userId = UUID.randomUUID();
        UUID currentId = UUID.randomUUID();
        UUID evidenceId = UUID.randomUUID();
        UUID legacyId = UUID.randomUUID();
        Instant now = Instant.now();
        String differentIp = "172.24.0.99";

        TrustedDeviceRepository devices = mock(TrustedDeviceRepository.class);
        SecurityAlertRepository alerts = mock(SecurityAlertRepository.class);
        AuthSessionRepository sessions = mock(AuthSessionRepository.class);
        UserRepository users = mock(UserRepository.class);
        NotificationService notifications = mock(NotificationService.class);
        HttpServletRequest request = mock(HttpServletRequest.class);

        AuthSession current = session(currentId, userId, UA, IP, "Brave · Windows", now.minus(5, ChronoUnit.MINUTES));
        AuthSession evidence = session(evidenceId, userId, LEGACY_BRAVE_UA, IP, "Brave · Windows", now.minus(30, ChronoUnit.MINUTES));
        AuthSession legacy = session(legacyId, userId, LEGACY_BRAVE_UA, differentIp, "Chrome · Windows", now.minus(12, ChronoUnit.HOURS));

        when(sessions.findById(currentId)).thenReturn(Optional.of(current));
        when(sessions.findTop50ByUserIdOrderByLastSeenAtDesc(userId)).thenReturn(List.of(current, evidence, legacy));
        when(devices.findByUserIdAndDeviceFingerprint(eq(userId), anyString())).thenReturn(Optional.empty());
        when(alerts.findByRelatedSessionId(currentId)).thenReturn(List.of());
        braveRequest(request);

        SecurityProtectionService service = new SecurityProtectionService(devices, alerts, sessions, users, notifications);
        service.syncCurrentClient(userId, currentId, request);

        assertThat(legacy.getDeviceName()).isEqualTo("Chrome · Windows");
        verify(alerts, never()).findByRelatedSessionId(legacyId);
        verify(sessions, never()).save(legacy);
    }

    private static AuthSession session(UUID id, UUID userId, String deviceName, Instant createdAt) {
        return session(id, userId, UA, IP, deviceName, createdAt);
    }

    private static AuthSession session(UUID id, UUID userId, String userAgent, String ipAddress, String deviceName, Instant createdAt) {
        AuthSession session = new AuthSession();
        session.setId(id);
        session.setUserId(userId);
        session.setDeviceName(deviceName);
        session.setUserAgent(userAgent);
        session.setIpAddress(ipAddress);
        session.setCreatedAt(createdAt);
        session.setLastSeenAt(createdAt);
        session.setExpiresAt(Instant.now().plus(1, ChronoUnit.DAYS));
        return session;
    }

    private static void braveRequest(HttpServletRequest request) {
        when(request.getHeader("User-Agent")).thenReturn(UA);
        when(request.getHeader(ClientDeviceDetector.BROWSER_HEADER)).thenReturn("Brave");
        when(request.getHeader(ClientDeviceDetector.CLIENT_HINT_HEADER)).thenReturn("\"Chromium\";v=\"152\", \"Brave\";v=\"152\"");
        when(request.getHeader("X-Forwarded-For")).thenReturn(IP);
    }
}
