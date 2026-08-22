package com.cinebooking.auth;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ClientDeviceDetectorTest {
    private static final String CHROMIUM_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36";

    @Test void braveClientHintOverridesChromeLikeUserAgent() {
        assertThat(ClientDeviceDetector.deviceName(CHROMIUM_WINDOWS, "Brave")).isEqualTo("Brave · Windows");
    }

    @Test void chromeStillFallsBackFromUserAgentWhenNoHintExists() {
        assertThat(ClientDeviceDetector.deviceName(CHROMIUM_WINDOWS, null)).isEqualTo("Chrome · Windows");
    }

    @Test void edgeWinsBeforeChromeInChromiumUserAgent() {
        String edge = CHROMIUM_WINDOWS + " Edg/151.0.0.0";
        assertThat(ClientDeviceDetector.deviceName(edge, null)).isEqualTo("Edge · Windows");
    }

    @Test void unsupportedClientHintCannotForgeArbitraryDisplayText() {
        assertThat(ClientDeviceDetector.deviceName(CHROMIUM_WINDOWS, "Totally Fake Browser")).isEqualTo("Chrome · Windows");
    }
}
