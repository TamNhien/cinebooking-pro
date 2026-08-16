package com.cinebooking.payment;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.Booking;
import com.cinebooking.domain.Payment;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Component
public class VnPayGateway {
    @Value("${app.payment.vnpay.payment-url}") private String paymentUrl;
    @Value("${app.payment.vnpay.tmn-code}") private String tmnCode;
    @Value("${app.payment.vnpay.hash-secret}") private String hashSecret;
    @Value("${app.payment.vnpay.return-url}") private String returnUrl;

    public String createUrl(Payment payment, Booking booking, String ipAddress, boolean qrOnly) {
        requireConfig();
        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDateTime now = LocalDateTime.now(zone);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        Map<String,String> p = new HashMap<>();
        p.put("vnp_Version","2.1.0"); p.put("vnp_Command","pay"); p.put("vnp_TmnCode",tmnCode);
        p.put("vnp_Amount", booking.getTotalAmount().movePointRight(2).toBigIntegerExact().toString());
        p.put("vnp_CurrCode","VND"); p.put("vnp_TxnRef",payment.getId().toString().replace("-", ""));
        p.put("vnp_OrderInfo","Thanh toan ve phim " + booking.getId()); p.put("vnp_OrderType","other"); p.put("vnp_Locale","vn");
        if(qrOnly) p.put("vnp_BankCode","VNPAYQR");
        p.put("vnp_ReturnUrl",returnUrl); p.put("vnp_IpAddr", ipAddress == null || ipAddress.isBlank() ? "127.0.0.1" : ipAddress);
        p.put("vnp_CreateDate",now.format(fmt)); p.put("vnp_ExpireDate",now.plusMinutes(15).format(fmt));
        String data = CryptoUtil.sortedQuery(p); String secureHash = CryptoUtil.hmac("HmacSHA512", hashSecret, data);
        return paymentUrl + "?" + data + "&vnp_SecureHash=" + secureHash;
    }

    public boolean verify(Map<String,String> input) {
        requireConfig(); Map<String,String> copy = new HashMap<>(input); String received = copy.remove("vnp_SecureHash"); copy.remove("vnp_SecureHashType");
        String calculated = CryptoUtil.hmac("HmacSHA512", hashSecret, CryptoUtil.sortedQuery(copy)); return CryptoUtil.constantTimeEquals(received, calculated);
    }
    private void requireConfig() { if (tmnCode == null || tmnCode.isBlank() || hashSecret == null || hashSecret.isBlank()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"Chưa cấu hình VNPAY sandbox"); }
}
