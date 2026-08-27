package com.cinebooking.payment;

import com.cinebooking.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import static com.cinebooking.payment.AdminPaymentDtos.GatewayReadiness;
import static com.cinebooking.payment.AdminPaymentDtos.ProductionReadiness;

@Service
public class PaymentProductionReadinessService {
    private final VnPayGateway vnPay;
    private final MomoGateway momo;
    private final boolean mockEnabled;
    private final boolean guardEnabled;

    public PaymentProductionReadinessService(
            VnPayGateway vnPay,
            MomoGateway momo,
            @Value("${app.payment.mock-enabled:true}") boolean mockEnabled,
            @Value("${app.payment.production-guard-enabled:true}") boolean guardEnabled) {
        this.vnPay = vnPay;
        this.momo = momo;
        this.mockEnabled = mockEnabled;
        this.guardEnabled = guardEnabled;
    }

    public ProductionReadiness snapshot() {
        List<GatewayReadiness> gateways = List.of(
                mockReadiness(),
                remote("VNPAY", "VNPay", vnPay.configured(), vnPay.mode(), vnPay.paymentUrl(), vnPay.queryUrl(), vnPay.returnUrl(), vnPay.ipnUrl()),
                remote("MOMO", "MoMo", momo.configured(), momo.mode(), momo.createUrl(), momo.queryUrl(), momo.redirectUrl(), momo.ipnUrl())
        );
        boolean allRemoteReady = gateways.stream()
                .filter(g -> !"MOCK".equals(g.provider()))
                .allMatch(GatewayReadiness::productionReady);
        return new ProductionReadiness(guardEnabled, allRemoteReady, Instant.now(), gateways);
    }

    public void ensureAllowed(String provider) {
        if (provider == null || provider.isBlank() || "MOCK".equals(provider)) return;
        GatewayReadiness readiness = snapshot().gateways().stream()
                .filter(g -> provider.startsWith(g.provider()))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Provider không hợp lệ"));
        if (!readiness.configured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, readiness.displayName() + " chưa được cấu hình merchant credentials");
        }
        if (guardEnabled && "production".equals(readiness.mode()) && !readiness.productionReady()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    readiness.displayName() + " production guard chặn checkout: " + String.join("; ", readiness.blockers()));
        }
    }

    private GatewayReadiness mockReadiness() {
        List<String> warnings = new ArrayList<>();
        if (mockEnabled) warnings.add("MOCK chỉ dành cho local/CI, không phải cổng thanh toán production");
        else warnings.add("MOCK đã tắt bằng cấu hình");
        return new GatewayReadiness(
                "MOCK", "Thanh toán nội bộ (MOCK)", true, "local", false,
                List.of("Không phải gateway production"), warnings,
                "local", "local", "local", "local");
    }

    private GatewayReadiness remote(String provider, String displayName, boolean configured, String mode,
                                    String checkoutUrl, String queryUrl, String returnUrl, String ipnUrl) {
        List<String> blockers = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        if (!configured) blockers.add("Chưa cấu hình merchant credentials");

        boolean production = "production".equalsIgnoreCase(mode);
        if (production) {
            requirePublicHttps("Checkout endpoint", checkoutUrl, blockers);
            requirePublicHttps("Query endpoint", queryUrl, blockers);
            requirePublicHttps("Return URL", returnUrl, blockers);
            requirePublicHttps("IPN URL", ipnUrl, blockers);
        } else {
            warnNonPublicCallback("Return URL", returnUrl, warnings);
            warnNonPublicCallback("IPN URL", ipnUrl, warnings);
            warnings.add("Gateway đang ở sandbox; chưa phải production traffic");
        }

        boolean productionReady = configured && production && blockers.isEmpty();
        return new GatewayReadiness(provider, displayName, configured, mode, productionReady,
                List.copyOf(blockers), List.copyOf(warnings),
                host(checkoutUrl), host(queryUrl), host(returnUrl), host(ipnUrl));
    }

    private void requirePublicHttps(String label, String value, List<String> blockers) {
        URI uri = parse(value);
        if (uri == null || !"https".equalsIgnoreCase(uri.getScheme())) {
            blockers.add(label + " phải dùng HTTPS ở production");
            return;
        }
        if (isLocalHost(uri.getHost())) blockers.add(label + " không được trỏ localhost/private placeholder ở production");
    }

    private void warnNonPublicCallback(String label, String value, List<String> warnings) {
        URI uri = parse(value);
        if (uri == null) {
            warnings.add(label + " chưa phải URL hợp lệ");
            return;
        }
        if (!"https".equalsIgnoreCase(uri.getScheme()) || isLocalHost(uri.getHost())) {
            warnings.add(label + " hiện chỉ phù hợp local/sandbox; gateway công khai cần callback HTTPS reachable");
        }
    }

    private URI parse(String value) {
        try { return value == null || value.isBlank() ? null : URI.create(value); }
        catch (Exception ignored) { return null; }
    }

    private String host(String value) {
        URI uri = parse(value);
        if (uri == null || uri.getHost() == null || uri.getHost().isBlank()) return "-";
        return uri.getHost().toLowerCase(Locale.ROOT);
    }

    private boolean isLocalHost(String host) {
        if (host == null) return true;
        String h = host.toLowerCase(Locale.ROOT);
        return h.equals("localhost") || h.equals("127.0.0.1") || h.equals("0.0.0.0") || h.equals("::1") || h.endsWith(".local");
    }
}
