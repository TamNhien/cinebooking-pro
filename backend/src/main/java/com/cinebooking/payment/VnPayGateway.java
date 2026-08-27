package com.cinebooking.payment;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.Booking;
import com.cinebooking.domain.Payment;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Component
public class VnPayGateway {
    public record Session(String paymentUrl,String orderId,String requestId,String providerCreatedAt){}
    public record QueryResult(boolean signatureValid,String responseCode,String transactionStatus,String transactionNo,String message,long amount){}

    @Value("${app.payment.vnpay.payment-url}") private String paymentUrl;
    @Value("${app.payment.vnpay.query-url}") private String queryUrl;
    @Value("${app.payment.vnpay.tmn-code}") private String tmnCode;
    @Value("${app.payment.vnpay.hash-secret}") private String hashSecret;
    @Value("${app.payment.vnpay.return-url}") private String returnUrl;
    @Value("${app.payment.vnpay.ipn-url}") private String ipnUrl;
    private final ObjectMapper mapper;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();

    public VnPayGateway(ObjectMapper mapper){this.mapper=mapper;}

    public Session create(Payment payment, Booking booking, String ipAddress, boolean qrOnly) {
        requireConfig();
        ZoneId zone = ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDateTime now = LocalDateTime.now(zone);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        String orderId=payment.getProviderOrderId()==null?payment.getId().toString().replace("-", ""):payment.getProviderOrderId();
        String requestId=payment.getMerchantRequestId()==null?payment.getId().toString().replace("-", ""):payment.getMerchantRequestId();
        String createdAt=payment.getProviderCreatedAt()==null?now.format(fmt):payment.getProviderCreatedAt();
        Map<String,String> p = new HashMap<>();
        p.put("vnp_Version","2.1.0"); p.put("vnp_Command","pay"); p.put("vnp_TmnCode",tmnCode);
        p.put("vnp_Amount", booking.getTotalAmount().movePointRight(2).toBigIntegerExact().toString());
        p.put("vnp_CurrCode","VND"); p.put("vnp_TxnRef",orderId);
        p.put("vnp_OrderInfo","Thanh toan ve phim " + booking.getId()); p.put("vnp_OrderType","other"); p.put("vnp_Locale","vn");
        if(qrOnly) p.put("vnp_BankCode","VNPAYQR");
        p.put("vnp_ReturnUrl",returnUrl); p.put("vnp_IpAddr", normalizeIp(ipAddress));
        p.put("vnp_CreateDate",createdAt);
        LocalDateTime expiry=booking.getExpiresAt()==null?now.plusMinutes(5):LocalDateTime.ofInstant(booking.getExpiresAt(),zone);
        p.put("vnp_ExpireDate",expiry.format(fmt));
        String data = CryptoUtil.sortedQuery(p); String secureHash = CryptoUtil.hmac("HmacSHA512", hashSecret, data);
        return new Session(paymentUrl + "?" + data + "&vnp_SecureHash=" + secureHash,orderId,requestId,createdAt);
    }

    public boolean verify(Map<String,String> input) {
        requireConfig();
        Map<String,String> copy = new HashMap<>();
        input.forEach((k,v)->{if(k!=null&&k.startsWith("vnp_"))copy.put(k,v);});
        String received = copy.remove("vnp_SecureHash"); copy.remove("vnp_SecureHashType");
        String calculated = CryptoUtil.hmac("HmacSHA512", hashSecret, CryptoUtil.sortedQuery(copy));
        return CryptoUtil.constantTimeEquals(received, calculated);
    }

    public QueryResult query(Payment payment,String ipAddress){
        requireConfig();
        if(payment.getProviderOrderId()==null||payment.getProviderOrderId().isBlank()||payment.getProviderCreatedAt()==null||payment.getProviderCreatedAt().isBlank())
            throw new ApiException(HttpStatus.CONFLICT,"Payment cũ chưa có đủ metadata để đối soát VNPAY");
        try{
            ZoneId zone=ZoneId.of("Asia/Ho_Chi_Minh");DateTimeFormatter fmt=DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
            String requestId=UUID.randomUUID().toString().replace("-","");
            String createDate=LocalDateTime.now(zone).format(fmt);
            String orderInfo="Doi soat payment "+payment.getId();
            String data=String.join("|",requestId,"2.1.0","querydr",tmnCode,payment.getProviderOrderId(),payment.getProviderCreatedAt(),createDate,normalizeIp(ipAddress),orderInfo);
            Map<String,Object> body=new LinkedHashMap<>();
            body.put("vnp_RequestId",requestId);body.put("vnp_Version","2.1.0");body.put("vnp_Command","querydr");body.put("vnp_TmnCode",tmnCode);
            body.put("vnp_TxnRef",payment.getProviderOrderId());body.put("vnp_OrderInfo",orderInfo);body.put("vnp_TransactionDate",payment.getProviderCreatedAt());
            body.put("vnp_CreateDate",createDate);body.put("vnp_IpAddr",normalizeIp(ipAddress));body.put("vnp_SecureHash",CryptoUtil.hmac("HmacSHA512",hashSecret,data));
            HttpRequest req=HttpRequest.newBuilder(URI.create(queryUrl)).timeout(Duration.ofSeconds(35)).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body))).build();
            HttpResponse<String> res=http.send(req,HttpResponse.BodyHandlers.ofString());
            JsonNode j=mapper.readTree(res.body());
            if(res.statusCode()/100!=2)throw new ApiException(HttpStatus.BAD_GATEWAY,"VNPAY query HTTP "+res.statusCode());
            String responseHash=j.path("vnp_SecureHash").asText("");
            String responseData=String.join("|",
                    text(j,"vnp_ResponseId"),text(j,"vnp_Command"),text(j,"vnp_ResponseCode"),text(j,"vnp_Message"),text(j,"vnp_TmnCode"),text(j,"vnp_TxnRef"),
                    text(j,"vnp_Amount"),text(j,"vnp_BankCode"),text(j,"vnp_PayDate"),text(j,"vnp_TransactionNo"),text(j,"vnp_TransactionType"),text(j,"vnp_TransactionStatus"),text(j,"vnp_OrderInfo"),
                    text(j,"vnp_PromotionCode"),text(j,"vnp_PromotionAmount"));
            boolean signatureValid=!responseHash.isBlank()&&CryptoUtil.constantTimeEquals(responseHash,CryptoUtil.hmac("HmacSHA512",hashSecret,responseData));
            return new QueryResult(signatureValid,text(j,"vnp_ResponseCode"),text(j,"vnp_TransactionStatus"),text(j,"vnp_TransactionNo"),text(j,"vnp_Message"),longValue(j,"vnp_Amount"));
        }catch(ApiException e){throw e;}catch(Exception e){throw new ApiException(HttpStatus.BAD_GATEWAY,"Không truy vấn được trạng thái VNPAY");}
    }


    public boolean merchantMatches(Map<String,String> params){
        if(!configured()) return false;
        String actual=params.getOrDefault("vnp_TmnCode","").trim();
        return !actual.isBlank() && CryptoUtil.constantTimeEquals(actual,tmnCode);
    }
    public String paymentUrl(){return paymentUrl;}
    public String queryUrl(){return queryUrl;}
    public String returnUrl(){return returnUrl;}
    public String ipnUrl(){return ipnUrl;}
    public boolean configured(){return tmnCode!=null&&!tmnCode.isBlank()&&hashSecret!=null&&!hashSecret.isBlank();}
    public String mode(){String u=paymentUrl==null?"":paymentUrl.toLowerCase(Locale.ROOT);return u.contains("sandbox")?"sandbox":"production";}
    private String normalizeIp(String ip){return ip==null||ip.isBlank()?"127.0.0.1":ip;}
    private String text(JsonNode j,String key){return j.path(key).asText("");}
    private long longValue(JsonNode j,String key){try{return Long.parseLong(text(j,key));}catch(Exception e){return -1;}}
    private void requireConfig() { if (!configured()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"Chưa cấu hình VNPAY"); }
}
