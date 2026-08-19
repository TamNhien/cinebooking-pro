package com.cinebooking.payment;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

final class CryptoUtil {
    private CryptoUtil() {}
    static String hmac(String algorithm, String secret, String data) {
        try {
            Mac mac = Mac.getInstance(algorithm);
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), algorithm));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new IllegalStateException(e); }
    }
    static String sha256(String data) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception e) { throw new IllegalStateException(e); }
    }
    static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(a.toLowerCase().getBytes(StandardCharsets.US_ASCII), b.toLowerCase().getBytes(StandardCharsets.US_ASCII));
    }
    static String urlEncode(String s) { return URLEncoder.encode(s, StandardCharsets.UTF_8).replace("+", "%20"); }
    static String sortedQuery(Map<String,String> params) {
        return new TreeMap<>(params).entrySet().stream()
                .filter(e -> e.getValue()!=null && !e.getValue().isBlank())
                .map(e -> urlEncode(e.getKey()) + "=" + urlEncode(e.getValue()))
                .collect(Collectors.joining("&"));
    }
    static String canonicalMap(Map<?,?> params) {
        return params.entrySet().stream()
                .sorted(java.util.Comparator.comparing(e -> String.valueOf(e.getKey())))
                .map(e -> String.valueOf(e.getKey()) + "=" + String.valueOf(e.getValue()))
                .collect(Collectors.joining("&"));
    }
}
