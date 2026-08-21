package com.cinebooking.payment;

import com.cinebooking.booking.BookingDtos.BookingResponse;
import com.cinebooking.booking.BookingService;
import com.cinebooking.commerce.InventoryService;
import com.cinebooking.commerce.LoyaltyService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.finance.FinancialLedgerService;
import com.cinebooking.notification.NotificationService;
import com.cinebooking.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

import static com.cinebooking.payment.PaymentDtos.*;

@Service
public class PaymentService {
    private final PaymentRepository payments;
    private final PaymentWebhookEventRepository webhooks;
    private final PaymentAttemptService attempts;
    private final BookingService bookingService;
    private final UserRepository users;
    private final VnPayGateway vnPay;
    private final MomoGateway momo;
    private final LoyaltyService loyalty;
    private final NotificationService notifications;
    private final InventoryService inventory;
    private final FinancialLedgerService finance;
    private final boolean mockEnabled;

    public PaymentService(PaymentRepository payments,PaymentWebhookEventRepository webhooks,PaymentAttemptService attempts,BookingService bookingService,UserRepository users,VnPayGateway vnPay,MomoGateway momo,LoyaltyService loyalty,NotificationService notifications,InventoryService inventory,FinancialLedgerService finance,@Value("${app.payment.mock-enabled:true}") boolean mockEnabled){
        this.payments=payments;this.webhooks=webhooks;this.attempts=attempts;this.bookingService=bookingService;this.users=users;this.vnPay=vnPay;this.momo=momo;this.loyalty=loyalty;this.notifications=notifications;this.inventory=inventory;this.finance=finance;this.mockEnabled=mockEnabled;
    }

    public PaymentStartResponse start(UUID bookingId,String email,String providerRaw,String ipAddress,String idempotencyKey){
        String requested=providerRaw.trim().toUpperCase(Locale.ROOT);
        Set<String> allowed=Set.of("MOCK","VNPAY","VNPAY_QR","MOMO","MOMO_QR");
        if(!allowed.contains(requested))throw new ApiException(HttpStatus.BAD_REQUEST,"provider không hợp lệ");
        if("MOCK".equals(requested)&&!mockEnabled)throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"Mock payment đã bị tắt trên môi trường này");
        String key=normalizeIdempotencyKey(idempotencyKey);

        BookingResponse owned=bookingService.getOwned(bookingId,email);
        String provider=owned.totalAmount().signum()==0?"BALANCE":requested;
        PaymentAttemptService.StartClaim claim=attempts.claim(bookingId,email,provider,key);
        Payment p=claim.payment();

        if(p.getStatus()==PaymentStatus.SUCCESS||p.getStatus()==PaymentStatus.REFUNDED||p.getStatus()==PaymentStatus.REVIEW)return startResponse(p,true);
        if(p.getStatus()==PaymentStatus.FAILED||p.getStatus()==PaymentStatus.EXPIRED)throw new ApiException(HttpStatus.CONFLICT,"Payment với Idempotency-Key này đã kết thúc ở trạng thái "+p.getStatus());
        if(p.getCheckoutUrl()!=null&&!p.getCheckoutUrl().isBlank())return startResponse(p,true);

        if("BALANCE".equals(provider)){
            success(p,"BALANCE-"+System.currentTimeMillis(),"00","Zero-balance checkout");
            return startResponse(payments.findById(p.getId()).orElseThrow(),claim.replayed());
        }

        try{
            String url=null,qr=null,deeplink=null;
            if("MOCK".equals(provider)){
                url="/payment/mock?bookingId="+bookingId+"&paymentId="+p.getId();
            }else if(provider.startsWith("VNPAY")){
                var s=vnPay.create(p,claim.booking(),ipAddress,"VNPAY_QR".equals(provider));
                url=s.paymentUrl();
            }else{
                var s=momo.create(p,claim.booking());
                url=s.payUrl();qr=s.qrData();deeplink=s.deeplink();
            }
            Payment saved=attempts.attachSession(p.getId(),url,qr,deeplink,"SESSION_CREATED",claim.replayed()?"Replayed payment session":"Payment session created");
            return startResponse(saved,claim.replayed());
        }catch(RuntimeException e){
            attempts.recordGatewayError(p.getId(),"GATEWAY_UNAVAILABLE",safeMessage(e));
            throw e;
        }
    }

    public PaymentCheckoutResponse checkout(UUID paymentId,String email){return checkoutView(owned(paymentId,email));}

    public List<PaymentHistoryItem> history(String email){
        UUID payerId=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản")).getId();
        return payments.findByPayerUserIdOrderByCreatedAtDesc(payerId).stream().map(p->{
            BookingResponse b=bookingService.toDto(bookingService.entity(p.getBookingId()));
            return new PaymentHistoryItem(p.getId(),p.getBookingId(),p.getPayerUserId(),b.movieTitle(),p.getProvider(),p.getStatus().name(),p.getAmount(),p.getRefundedAmount(),p.getRefundReference(),p.getProviderOrderId(),p.getProviderTransactionId(),p.getProviderResponseCode(),p.getProviderMessage(),p.getCreatedAt(),p.getUpdatedAt(),p.getExpiresAt(),p.getPaidAt(),p.getFailedAt(),p.getRefundedAt());
        }).toList();
    }

    public List<ProviderAvailability> providers(){return List.of(
            new ProviderAvailability("MOCK",mockEnabled,true,mockEnabled?"enabled":"disabled"),
            new ProviderAvailability("VNPAY",vnPay.configured(),false,vnPay.configured()?"configured":"credentials-required"),
            new ProviderAvailability("MOMO",momo.configured(),false,momo.configured()?"configured":"credentials-required")
    );}

    @Transactional
    public PaymentResultResponse mockSuccess(UUID bookingId,String email){
        Booking booking=bookingService.entity(bookingId);UUID userId=users.findByEmailIgnoreCase(email).orElseThrow().getId();
        if(!booking.getUserId().equals(userId))throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền");
        Payment p=payments.findFirstByBookingIdOrderByCreatedAtDesc(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Chưa có payment"));
        if(!"MOCK".equals(p.getProvider()))throw new ApiException(HttpStatus.BAD_REQUEST,"Payment không phải MOCK");
        if(!mockEnabled)throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"Mock payment đã bị tắt");
        return success(p,"MOCK-"+System.currentTimeMillis(),"00","Mock success");
    }

    @Transactional
    public PaymentResultResponse mockFail(UUID bookingId,String email){
        Booking booking=bookingService.entity(bookingId);UUID userId=users.findByEmailIgnoreCase(email).orElseThrow().getId();
        if(!booking.getUserId().equals(userId))throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền");
        Payment p=payments.findFirstByBookingIdOrderByCreatedAtDesc(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Chưa có payment"));
        if(!"MOCK".equals(p.getProvider()))throw new ApiException(HttpStatus.BAD_REQUEST,"Payment không phải MOCK");
        fail(p,"MOCK_FAILED","Mock failure",false);
        return result(p);
    }

    @Transactional
    public Map<String,String> vnPayIpn(Map<String,String> params){
        boolean signatureValid=vnPay.verify(params);
        String orderId=params.getOrDefault("vnp_TxnRef","");
        Payment p=payments.findByProviderInAndProviderOrderId(List.of("VNPAY","VNPAY_QR"),orderId).orElse(null);
        String eventKey=bounded(orderId+":"+params.getOrDefault("vnp_TransactionNo","")+":"+params.getOrDefault("vnp_ResponseCode","")+":"+params.getOrDefault("vnp_TransactionStatus",""),240);
        String resultCode=params.getOrDefault("vnp_ResponseCode","");
        String payloadHash=CryptoUtil.sha256(CryptoUtil.canonicalMap(params));
        if(!signatureValid){
            String rejectedKey=rejectedWebhookKey("signature",payloadHash);
            if(!claimWebhook("VNPAY",rejectedKey,p,payloadHash,false,resultCode))return previousVnPayResponse(rejectedKey);
            return finishVnPay(rejectedKey,p,"97","Invalid checksum");
        }
        if(p==null){
            if(!claimWebhook("VNPAY",eventKey,null,payloadHash,true,resultCode))return previousVnPayResponse(eventKey);
            return finishVnPay(eventKey,null,"01","Order not found");
        }
        if(!validVnPayAmount(p,params)){
            String rejectedKey=rejectedWebhookKey("amount",payloadHash);
            if(!claimWebhook("VNPAY",rejectedKey,p,payloadHash,true,resultCode))return previousVnPayResponse(rejectedKey);
            return finishVnPay(rejectedKey,p,"04","Invalid amount");
        }
        if(!claimWebhook("VNPAY",eventKey,p,payloadHash,true,resultCode))return previousVnPayResponse(eventKey);
        p.setLastWebhookAt(Instant.now());p.setProviderResponseCode(resultCode);p.setProviderMessage(params.getOrDefault("vnp_TransactionStatus",""));payments.save(p);
        if(p.getStatus()==PaymentStatus.SUCCESS)return finishVnPay(eventKey,p,"02","Order already confirmed");
        String transactionStatus=params.getOrDefault("vnp_TransactionStatus","");
        if("00".equals(resultCode)&&"00".equals(transactionStatus)){
            success(p,params.getOrDefault("vnp_TransactionNo",orderId),resultCode,"VNPAY success");
            return finishVnPay(eventKey,p,"00","Confirm Success");
        }
        if("01".equals(transactionStatus))return finishVnPay(eventKey,p,"00","Pending status recorded");
        if(Set.of("04","05","06").contains(transactionStatus)){
            p.setStatus(PaymentStatus.REVIEW);p.setProviderResponseCode(resultCode+"/"+transactionStatus);p.setProviderMessage("VNPAY status requires reconciliation: "+transactionStatus);payments.save(p);
            return finishVnPay(eventKey,p,"00","Review status recorded");
        }
        fail(p,resultCode,"VNPAY transaction status "+transactionStatus,false);
        return finishVnPay(eventKey,p,"00","Payment failed recorded");
    }

    @Transactional
    public Map<String,Object> momoIpn(Map<String,Object> params){
        boolean signatureValid=momo.verifyIpn(params);
        String orderId=String.valueOf(params.getOrDefault("orderId",""));
        Payment p=payments.findByProviderInAndProviderOrderId(List.of("MOMO","MOMO_QR"),orderId).orElse(null);
        String code=String.valueOf(params.getOrDefault("resultCode","-1"));
        String eventKey=bounded(orderId+":"+String.valueOf(params.getOrDefault("transId",""))+":"+code,240);
        String payloadHash=CryptoUtil.sha256(CryptoUtil.canonicalMap(params));
        if(!signatureValid){
            String rejectedKey=rejectedWebhookKey("signature",payloadHash);
            if(!claimWebhook("MOMO",rejectedKey,p,payloadHash,false,code))return previousMomoResponse(rejectedKey);
            return finishMomo(rejectedKey,p,97,"Invalid signature");
        }
        if(p==null){
            if(!claimWebhook("MOMO",eventKey,null,payloadHash,true,code))return previousMomoResponse(eventKey);
            return finishMomo(eventKey,null,1,"Order not found");
        }
        if(!validMomoAmount(p,params)){
            String rejectedKey=rejectedWebhookKey("amount",payloadHash);
            if(!claimWebhook("MOMO",rejectedKey,p,payloadHash,true,code))return previousMomoResponse(rejectedKey);
            return finishMomo(rejectedKey,p,1,"Invalid amount");
        }
        if(!claimWebhook("MOMO",eventKey,p,payloadHash,true,code))return previousMomoResponse(eventKey);
        p.setLastWebhookAt(Instant.now());p.setProviderResponseCode(code);p.setProviderMessage(String.valueOf(params.getOrDefault("message","")));payments.save(p);
        int result=parseInt(code,-1);
        if(result==0){success(p,String.valueOf(params.getOrDefault("transId",orderId)),code,String.valueOf(params.getOrDefault("message","Successful")));return finishMomo(eventKey,p,0,"success");}
        if(Set.of(7000,7002,9000).contains(result))return finishMomo(eventKey,p,0,"pending acknowledged");
        fail(p,code,String.valueOf(params.getOrDefault("message","MoMo payment failed")),false);
        return finishMomo(eventKey,p,0,"failure recorded");
    }

    public PaymentReturnResponse vnPayReturn(Map<String,String> params){
        boolean signatureValid=vnPay.verify(params);String orderId=params.getOrDefault("vnp_TxnRef","");
        Payment p=payments.findByProviderInAndProviderOrderId(List.of("VNPAY","VNPAY_QR"),orderId).orElse(null);
        String message=!signatureValid?"Invalid checksum":p==null?"Order not found":!validVnPayAmount(p,params)?"Invalid amount":"Return verified; waiting for server IPN is allowed";
        return returnView("VNPAY",p,signatureValid&&p!=null&&validVnPayAmount(p,params),params.getOrDefault("vnp_ResponseCode",""),message);
    }

    public PaymentReturnResponse momoReturn(Map<String,Object> params){
        boolean signatureValid=momo.verifyIpn(params);String orderId=String.valueOf(params.getOrDefault("orderId",""));
        Payment p=payments.findByProviderInAndProviderOrderId(List.of("MOMO","MOMO_QR"),orderId).orElse(null);
        boolean valid=signatureValid&&p!=null&&validMomoAmount(p,params);
        String message=!signatureValid?"Invalid signature":p==null?"Order not found":!validMomoAmount(p,params)?"Invalid amount":"Return verified; payment state comes from server IPN/reconciliation";
        return returnView("MOMO",p,valid,String.valueOf(params.getOrDefault("resultCode","")),message);
    }

    @Transactional
    public PaymentResultResponse success(Payment input,String providerTxn,String responseCode,String message){
        Payment p=payments.findByIdForUpdate(input.getId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy payment"));
        if(p.getStatus()==PaymentStatus.SUCCESS){awardLoyaltyIfNeeded(p);finance.recordPaymentCapture(p,bookingService.entity(p.getBookingId()));return result(p);}
        if(p.getStatus()==PaymentStatus.REFUNDED)return result(p);
        Booking current=bookingService.entity(p.getBookingId());
        if(current.getStatus()!=BookingStatus.PENDING&&current.getStatus()!=BookingStatus.CONFIRMED){
            p.setStatus(PaymentStatus.REVIEW);p.setPaidAt(Instant.now());p.setProviderTransactionId(providerTxn);p.setProviderResponseCode(responseCode);p.setProviderMessage("Gateway reported success after booking became "+current.getStatus()+"; manual review/refund required");payments.save(p);
            finance.recordPaymentCapture(p,current);
            notifications.create(current.getUserId(),"PAYMENT_REVIEW","Thanh toán cần được kiểm tra","Cổng thanh toán đã báo thành công nhưng booking "+current.getId()+" không còn ở trạng thái chờ. CineBooking sẽ cần đối soát giao dịch.","/bookings");
            return result(p);
        }
        if(current.getExpiresAt()!=null&&current.getExpiresAt().isBefore(Instant.now())&&current.getStatus()!=BookingStatus.CONFIRMED){
            p.setStatus(PaymentStatus.REVIEW);p.setPaidAt(Instant.now());p.setProviderTransactionId(providerTxn);p.setProviderResponseCode(responseCode);p.setProviderMessage("Gateway success arrived after payment window expired; manual review/refund required");payments.save(p);
            finance.recordPaymentCapture(p,current);
            return result(p);
        }
        inventory.finalizeSale(p.getBookingId());
        Booking b=bookingService.confirm(p.getBookingId());
        p.setStatus(PaymentStatus.SUCCESS);p.setPaidAt(Instant.now());p.setFailedAt(null);p.setProviderTransactionId(providerTxn);p.setProviderResponseCode(responseCode);p.setProviderMessage(message);
        awardLoyaltyIfNeeded(p);payments.save(p);
        finance.recordPaymentCapture(p,b);
        notifications.create(b.getUserId(),"PAYMENT_SUCCESS","Thanh toán thành công","Vé "+b.getId()+" đã được xác nhận. Bạn có thể mở QR vé trong mục Vé của tôi.","/ticket/"+b.getId());
        return new PaymentResultResponse(p.getId(),p.getBookingId(),p.getProvider(),p.getStatus().name(),b.getStatus().name());
    }

    @Transactional
    public int expireStale(){
        int count=0;
        for(Payment p:payments.findByStatusAndExpiresAtBefore(PaymentStatus.PENDING,Instant.now())){
            Payment locked=payments.findByIdForUpdate(p.getId()).orElse(null);if(locked==null||locked.getStatus()!=PaymentStatus.PENDING)continue;
            locked.setStatus(PaymentStatus.EXPIRED);locked.setFailedAt(Instant.now());locked.setProviderResponseCode("EXPIRED");locked.setProviderMessage("Booking payment window expired");payments.save(locked);bookingService.cancelPending(locked.getBookingId(),BookingStatus.EXPIRED);count++;
        }
        return count;
    }

    private void fail(Payment input,String code,String message,boolean cancelBooking){
        Payment p=payments.findByIdForUpdate(input.getId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy payment"));
        if(p.getStatus()==PaymentStatus.SUCCESS||p.getStatus()==PaymentStatus.REFUNDED)return;
        p.setStatus(PaymentStatus.FAILED);p.setFailedAt(Instant.now());p.setProviderResponseCode(code);p.setProviderMessage(message);payments.save(p);
        if(cancelBooking)bookingService.cancelPending(p.getBookingId(),BookingStatus.CANCELLED);
    }

    private Payment owned(UUID paymentId,String email){
        Payment p=payments.findById(paymentId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy payment"));
        UUID userId=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản")).getId();
        if(!userId.equals(p.getPayerUserId()))throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền xem giao dịch thanh toán này");
        return p;
    }
    private PaymentCheckoutResponse checkoutView(Payment p){return new PaymentCheckoutResponse(p.getId(),p.getBookingId(),p.getProvider(),p.getStatus().name(),p.getAmount(),p.getCheckoutUrl(),p.getQrPayload(),p.getDeeplink(),p.getProviderOrderId(),p.getProviderTransactionId(),p.getProviderResponseCode(),p.getProviderMessage(),p.getCreatedAt(),p.getUpdatedAt(),p.getExpiresAt(),p.getPaidAt(),p.getFailedAt());}
    private PaymentStartResponse startResponse(Payment p,boolean replayed){String url="MOMO_QR".equals(p.getProvider())?"/payment/qr?paymentId="+p.getId():p.getCheckoutUrl();if("BALANCE".equals(p.getProvider())||p.getStatus()==PaymentStatus.SUCCESS||p.getStatus()==PaymentStatus.REFUNDED||p.getStatus()==PaymentStatus.REVIEW)url="/bookings";return new PaymentStartResponse(p.getId(),p.getBookingId(),p.getProvider(),url,p.getQrPayload(),p.getDeeplink(),p.getExpiresAt(),replayed);}
    private PaymentReturnResponse returnView(String provider,Payment p,boolean valid,String code,String message){if(p==null)return new PaymentReturnResponse(valid,provider,null,null,null,null,code,message);Booking b=bookingService.entity(p.getBookingId());return new PaymentReturnResponse(valid,provider,p.getId(),p.getBookingId(),p.getStatus().name(),b.getStatus().name(),code,message);}
    private boolean validVnPayAmount(Payment p,Map<String,String> params){try{return p.getAmount().movePointRight(2).longValueExact()==Long.parseLong(params.getOrDefault("vnp_Amount","-1"));}catch(Exception e){return false;}}
    private boolean validMomoAmount(Payment p,Map<String,Object> params){try{return p.getAmount().longValueExact()==Long.parseLong(String.valueOf(params.getOrDefault("amount","-1")));}catch(Exception e){return false;}}

    private boolean claimWebhook(String provider,String eventKey,Payment p,String payloadHash,boolean signatureValid,String resultCode){return webhooks.claim(UUID.randomUUID(),provider,eventKey,p==null?null:p.getId(),payloadHash,signatureValid,resultCode,Instant.now())==1;}
    private Map<String,String> previousVnPayResponse(String eventKey){return webhooks.findByProviderAndEventKey("VNPAY",eventKey).map(e->Map.of("RspCode",e.getResponseCode()==null?"02":e.getResponseCode(),"Message",e.getResponseMessage()==null?"Duplicate notification":e.getResponseMessage())).orElse(Map.of("RspCode","02","Message","Duplicate notification"));}
    private Map<String,Object> previousMomoResponse(String eventKey){return webhooks.findByProviderAndEventKey("MOMO",eventKey).map(e->{int code=parseInt(e.getResponseCode(),0);return Map.<String,Object>of("resultCode",code,"message",e.getResponseMessage()==null?"duplicate acknowledged":e.getResponseMessage());}).orElse(Map.of("resultCode",0,"message","duplicate acknowledged"));}
    private Map<String,String> finishVnPay(String eventKey,Payment p,String code,String message){finishWebhook("VNPAY",eventKey,p,code,message);return Map.of("RspCode",code,"Message",message);}
    private Map<String,Object> finishMomo(String eventKey,Payment p,int code,String message){finishWebhook("MOMO",eventKey,p,String.valueOf(code),message);return Map.of("resultCode",code,"message",message);}
    private String rejectedWebhookKey(String reason,String payloadHash){return bounded("rejected:"+reason+":"+payloadHash,240);}
    private void finishWebhook(String provider,String eventKey,Payment p,String code,String message){webhooks.findByProviderAndEventKey(provider,eventKey).ifPresent(e->{e.setPaymentId(p==null?e.getPaymentId():p.getId());e.setResponseCode(code);e.setResponseMessage(message);e.setProcessedAt(Instant.now());webhooks.save(e);});}

    private String normalizeIdempotencyKey(String key){if(key==null||key.isBlank())return null;String v=key.trim();if(v.length()>120)throw new ApiException(HttpStatus.BAD_REQUEST,"Idempotency-Key tối đa 120 ký tự");if(!v.matches("[A-Za-z0-9._:-]+"))throw new ApiException(HttpStatus.BAD_REQUEST,"Idempotency-Key chứa ký tự không hợp lệ");return v;}
    private int parseInt(String value,int fallback){try{return Integer.parseInt(value);}catch(Exception e){return fallback;}}
    private String bounded(String value,int max){return value.length()<=max?value:value.substring(0,max);}
    private String safeMessage(Throwable e){String m=e.getMessage();return m==null||m.isBlank()?e.getClass().getSimpleName():bounded(m,450);}

    private void awardLoyaltyIfNeeded(Payment p){
        if(p.getLoyaltyPointsAwarded()!=null&&p.getLoyaltyPointsAwarded()>0)return;
        Booking booking=bookingService.entity(p.getBookingId());
        UUID benefitOwner=booking.getPurchaserUserId()==null?booking.getUserId():booking.getPurchaserUserId();
        int points=loyalty.awardForPayment(benefitOwner,booking.getId(),p.getAmount());
        p.setLoyaltyPointsAwarded(points);
    }
    private PaymentResultResponse result(Payment p){Booking b=bookingService.entity(p.getBookingId());return new PaymentResultResponse(p.getId(),p.getBookingId(),p.getProvider(),p.getStatus().name(),b.getStatus().name());}
}
