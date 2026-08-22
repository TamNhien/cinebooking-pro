package com.cinebooking.auth;

import jakarta.servlet.http.HttpServletRequest;

import java.util.Locale;
import java.util.Set;

/**
 * Display-only browser/OS detection for security session metadata.
 * Chromium-based browsers such as Brave intentionally expose a Chrome-like
 * User-Agent, so the frontend may send a narrow browser hint after verifying
 * navigator.brave.isBrave(). The hint is never used as an authentication or
 * authorization signal.
 */
public final class ClientDeviceDetector {
    public static final String BROWSER_HEADER = "X-CineBooking-Browser";
    private static final Set<String> ALLOWED_HINTS = Set.of(
            "Brave", "Edge", "Firefox", "Chrome", "Safari", "Opera", "Vivaldi", "Samsung Internet"
    );

    private ClientDeviceDetector() {}

    public static String deviceName(HttpServletRequest request) {
        if (request == null) return "Thiết bị không xác định";
        return deviceName(request.getHeader("User-Agent"), request.getHeader(BROWSER_HEADER));
    }

    public static String deviceName(String userAgent, String browserHint) {
        if ((userAgent == null || userAgent.isBlank()) && (browserHint == null || browserHint.isBlank())) {
            return "Thiết bị không xác định";
        }
        return browser(userAgent, browserHint) + " · " + operatingSystem(userAgent);
    }

    public static String browser(String userAgent, String browserHint) {
        String hint = normalizeHint(browserHint);
        if (hint != null) return hint;
        String u = normalize(userAgent);
        if (u.contains("brave/")) return "Brave";
        if (u.contains("edg/") || u.contains("edga/") || u.contains("edgios/")) return "Edge";
        if (u.contains("opr/") || u.contains("opera/")) return "Opera";
        if (u.contains("vivaldi/")) return "Vivaldi";
        if (u.contains("samsungbrowser/")) return "Samsung Internet";
        if (u.contains("firefox/") || u.contains("fxios/")) return "Firefox";
        if (u.contains("chrome/") || u.contains("crios/")) return "Chrome";
        if (u.contains("safari/")) return "Safari";
        return "Trình duyệt";
    }

    public static String operatingSystem(String userAgent) {
        String u = normalize(userAgent);
        if (u.contains("windows")) return "Windows";
        if (u.contains("android")) return "Android";
        if (u.contains("iphone") || u.contains("ipad") || u.contains("ipod")) return "iOS/iPadOS";
        if (u.contains("mac os") || u.contains("macintosh")) return "macOS";
        if (u.contains("linux")) return "Linux";
        return "Thiết bị";
    }

    public static String normalizeHint(String value) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        for (String allowed : ALLOWED_HINTS) {
            if (allowed.equalsIgnoreCase(trimmed)) return allowed;
        }
        return null;
    }

    private static String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }
}
