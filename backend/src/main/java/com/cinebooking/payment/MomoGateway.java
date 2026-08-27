package com.cinebooking.payment;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.Booking;
import com.cinebooking.domain.Payment;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.net.URI;import java.net.http.*;import java.time.Duration;import java.util.*;

@Component
public class MomoGateway {
    public record Session(String payUrl,String qrData,String deeplink,String orderId,String requestId){}
    public record QueryResult(String resultCode,String message,String transactionId,long amount){}
    @Value("${app.payment.momo.create-url}") private String createUrl;
    @Value("${app.payment.momo.query-url}") private String queryUrl;
    @Value("${app.payment.momo.partner-code}") private String partnerCode;
    @Value("${app.payment.momo.access-key}") private String accessKey;
    @Value("${app.payment.momo.secret-key}") private String secretKey;
    @Value("${app.payment.momo.redirect-url}") private String redirectUrl;
    @Value("${app.payment.momo.ipn-url}") private String ipnUrl;
    private final ObjectMapper mapper; private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
    public MomoGateway(ObjectMapper mapper){this.mapper=mapper;}

    public Session create(Payment payment, Booking booking) {
        requireConfig();
        try {
            String requestId = payment.getMerchantRequestId()==null?payment.getId().toString():payment.getMerchantRequestId(); String orderId = payment.getProviderOrderId()==null?payment.getId().toString().replace("-", ""):payment.getProviderOrderId();
            String amount = booking.getTotalAmount().toBigIntegerExact().toString(); String orderInfo = "Thanh toan ve phim " + booking.getId(); String extraData = "";
            String raw = "accessKey="+accessKey+"&amount="+amount+"&extraData="+extraData+"&ipnUrl="+ipnUrl+"&orderId="+orderId+"&orderInfo="+orderInfo+"&partnerCode="+partnerCode+"&redirectUrl="+redirectUrl+"&requestId="+requestId+"&requestType=captureWallet";
            String signature = CryptoUtil.hmac("HmacSHA256", secretKey, raw);
            Map<String,Object> body = new LinkedHashMap<>(); body.put("partnerCode",partnerCode); body.put("storeId","CineBooking"); body.put("requestId",requestId);
            body.put("amount",Long.parseLong(amount)); body.put("orderId",orderId); body.put("orderInfo",orderInfo); body.put("redirectUrl",redirectUrl); body.put("ipnUrl",ipnUrl);
            body.put("requestType","captureWallet"); body.put("extraData",extraData); body.put("lang","vi"); body.put("signature",signature);
            HttpRequest req = HttpRequest.newBuilder(URI.create(createUrl)).timeout(Duration.ofSeconds(35)).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body))).build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString()); JsonNode json = mapper.readTree(res.body());
            if (res.statusCode()/100 != 2 || json.path("resultCode").asInt(-1) != 0 || json.path("payUrl").asText().isBlank()) throw new ApiException(HttpStatus.BAD_GATEWAY,"MoMo không tạo được phiên thanh toán: " + json.path("message").asText("unknown"));
            return new Session(json.path("payUrl").asText(),json.path("qrCodeUrl").asText(null),json.path("deeplink").asText(null),orderId,requestId);
        } catch (ApiException e) { throw e; } catch (Exception e) { throw new ApiException(HttpStatus.BAD_GATEWAY,"Không kết nối được MoMo"); }
    }

    public boolean verifyIpn(Map<String,Object> p) {
        requireConfig();
        String raw = "accessKey="+accessKey+"&amount="+val(p,"amount")+"&extraData="+val(p,"extraData")+"&message="+val(p,"message")+"&orderId="+val(p,"orderId")+"&orderInfo="+val(p,"orderInfo")+"&orderType="+val(p,"orderType")+"&partnerCode="+val(p,"partnerCode")+"&payType="+val(p,"payType")+"&requestId="+val(p,"requestId")+"&responseTime="+val(p,"responseTime")+"&resultCode="+val(p,"resultCode")+"&transId="+val(p,"transId");
        return CryptoUtil.constantTimeEquals(val(p,"signature"), CryptoUtil.hmac("HmacSHA256",secretKey,raw));
    }

    public QueryResult query(Payment payment){
        requireConfig();
        if(payment.getProviderOrderId()==null||payment.getProviderOrderId().isBlank())throw new ApiException(HttpStatus.CONFLICT,"Payment chưa có MoMo orderId");
        try{
            String requestId=UUID.randomUUID().toString();
            String raw="accessKey="+accessKey+"&orderId="+payment.getProviderOrderId()+"&partnerCode="+partnerCode+"&requestId="+requestId;
            Map<String,Object> body=new LinkedHashMap<>();body.put("partnerCode",partnerCode);body.put("requestId",requestId);body.put("orderId",payment.getProviderOrderId());body.put("lang","vi");body.put("signature",CryptoUtil.hmac("HmacSHA256",secretKey,raw));
            HttpRequest req=HttpRequest.newBuilder(URI.create(queryUrl)).timeout(Duration.ofSeconds(35)).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body))).build();
            HttpResponse<String> res=http.send(req,HttpResponse.BodyHandlers.ofString());JsonNode j=mapper.readTree(res.body());
            if(res.statusCode()/100!=2)throw new ApiException(HttpStatus.BAD_GATEWAY,"MoMo query HTTP "+res.statusCode());
            return new QueryResult(j.path("resultCode").asText("-1"),j.path("message").asText(""),j.path("transId").asText(""),j.path("amount").asLong(-1));
        }catch(ApiException e){throw e;}catch(Exception e){throw new ApiException(HttpStatus.BAD_GATEWAY,"Không truy vấn được trạng thái MoMo");}
    }


    public boolean merchantMatches(Map<String,Object> params){
        if(!configured()) return false;
        String actual=val(params,"partnerCode").trim();
        return !actual.isBlank() && CryptoUtil.constantTimeEquals(actual,partnerCode);
    }
    public String createUrl(){return createUrl;}
    public String queryUrl(){return queryUrl;}
    public String redirectUrl(){return redirectUrl;}
    public String ipnUrl(){return ipnUrl;}
    public boolean configured(){return partnerCode!=null&&!partnerCode.isBlank()&&accessKey!=null&&!accessKey.isBlank()&&secretKey!=null&&!secretKey.isBlank();}
    public String mode(){String u=createUrl==null?"":createUrl.toLowerCase(Locale.ROOT);return u.contains("test-payment")||u.contains("test")?"sandbox":"production";}
    private String val(Map<String,Object> p,String k){Object v=p.get(k);return v==null?"":String.valueOf(v);}
    private void requireConfig(){ if(!configured()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"Chưa cấu hình MoMo"); }
}
