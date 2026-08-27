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
    private final PaymentEventService events;
    private final BookingService bookingService;
    private final UserRepository users;
    private final VnPayGateway vnPay;
    private final MomoGateway momo;
    private final LoyaltyService loyalty;
    private final NotificationService notifications;
    private final InventoryService inventory;
    private final FinancialLedgerService finance;
    private final PaymentProductionReadinessService productionReadiness;
    private final boolean mockEnabled;
    private final long reconcileMinAgeSeconds;

    public PaymentService(PaymentRepository payments,PaymentWebhookEventRepository webhooks,PaymentAttemptService attempts,PaymentEventService events,BookingService bookingService,UserRepository users,VnPayGateway vnPay,MomoGateway momo,LoyaltyService loyalty,NotificationService notifications,InventoryService inventory,FinancialLedgerService finance,PaymentProductionReadinessService productionReadiness,@Value("${app.payment.mock-enabled:true}") boolean mockEnabled,@Value("${app.payment.reconcile.min-age-seconds:45}") long reconcileMinAgeSeconds){
        this.payments=payments;this.webhooks=webhooks;this.attempts=attempts;this.events=events;this.bookingService=bookingService;this.users=users;this.vnPay=vnPay;this.momo=momo;this.loyalty=loyalty;this.notifications=notifications;this.inventory=inventory;this.finance=finance;this.productionReadiness=productionReadiness;this.mockEnabled=mockEnabled;this.reconcileMinAgeSeconds=Math.max(15,reconcileMinAgeSeconds);
    }

    public PaymentStartResponse start(UUID bookingId,String email,String providerRaw,String ipAddress,String idempotencyKey){
        String requested=normalizeProvider(providerRaw);
        String key=normalizeIdempotencyKey(idempotencyKey);
        BookingResponse owned=bookingService.getOwned(bookingId,email);
        String provider=owned.totalAmount().signum()==0?"BALANCE":requested;
        if(!"BALANCE".equals(provider))ensureProviderAvailable(provider);
        PaymentAttemptService.StartClaim claim=attempts.claim(bookingId,email,provider,key);
        Payment p=claim.payment();
        if(!claim.replayed()){
            String eventType=claim.retry()?"PAYMENT_RETRY_CREATED":"PAYMENT_CREATED";
            String message=claim.retry()?"Tạo lần thanh toán #"+p.getAttemptNo()+" từ lần trước":"Khởi tạo lần thanh toán #"+p.getAttemptNo();
            events.record(p.getId(),eventType,"USER",email,null,p.getStatus().name(),"ATTEMPT_"+p.getAttemptNo(),message,p.getRetryOfPaymentId()==null?null:json("retryOf",String.valueOf(p.getRetryOfPaymentId())));
        }
        return openSession(claim,email,ipAddress);
    }

    public PaymentStartResponse retry(UUID paymentId,String email,String providerRaw,String ipAddress,String idempotencyKey){
        String requested=normalizeProvider(providerRaw);ensureProviderAvailable(requested);
        String key=normalizeIdempotencyKey(idempotencyKey);
        PaymentAttemptService.StartClaim claim=attempts.retry(paymentId,email,requested,key);
        Payment p=claim.payment();
        if(!claim.replayed())events.record(p.getId(),"PAYMENT_RETRY_CREATED","USER",email,null,p.getStatus().name(),"ATTEMPT_"+p.getAttemptNo(),"Tạo lần thanh toán #"+p.getAttemptNo()+" từ lần trước",json("retryOf",String.valueOf(p.getRetryOfPaymentId())));
        return openSession(claim,email,ipAddress);
    }

    private PaymentStartResponse openSession(PaymentAttemptService.StartClaim claim,String email,String ipAddress){
        Payment p=claim.payment();String provider=p.getProvider();
        if(p.getStatus()==PaymentStatus.SUCCESS||p.getStatus()==PaymentStatus.REFUNDED||p.getStatus()==PaymentStatus.REVIEW)return startResponse(p,true);
        if(p.getStatus()==PaymentStatus.FAILED||p.getStatus()==PaymentStatus.EXPIRED||p.getStatus()==PaymentStatus.CANCELLED)throw new ApiException(HttpStatus.CONFLICT,"Payment với Idempotency-Key này đã kết thúc ở trạng thái "+p.getStatus());
        if(p.getCheckoutUrl()!=null&&!p.getCheckoutUrl().isBlank())return startResponse(p,true);
        if("BALANCE".equals(provider)){
            success(p,"BALANCE-"+System.currentTimeMillis(),"00","Zero-balance checkout");
            return startResponse(payments.findById(p.getId()).orElseThrow(),claim.replayed());
        }
        try{
            String url=null,qr=null,deeplink=null;
            if("MOCK".equals(provider))url="/payment/mock?bookingId="+p.getBookingId()+"&paymentId="+p.getId();
            else if(provider.startsWith("VNPAY")){var s=vnPay.create(p,claim.booking(),ipAddress,"VNPAY_QR".equals(provider));url=s.paymentUrl();}
            else {var s=momo.create(p,claim.booking());url=s.payUrl();qr=s.qrData();deeplink=s.deeplink();}
            Instant next=realProvider(provider)?Instant.now().plusSeconds(reconcileMinAgeSeconds):null;
            Payment saved=attempts.attachSession(p.getId(),url,qr,deeplink,"SESSION_CREATED",claim.replayed()?"Replayed payment session":"Payment session created",next);
            if(!claim.replayed())events.record(saved.getId(),"CHECKOUT_SESSION_CREATED","SYSTEM",null,saved.getStatus().name(),saved.getStatus().name(),"SESSION_CREATED","Đã tạo checkout session cho "+provider,json("provider",provider));
            return startResponse(saved,claim.replayed());
        }catch(RuntimeException e){
            attempts.recordGatewayError(p.getId(),"GATEWAY_UNAVAILABLE",safeMessage(e));
            events.record(p.getId(),"GATEWAY_SESSION_FAILED","SYSTEM",null,p.getStatus().name(),p.getStatus().name(),"GATEWAY_UNAVAILABLE",safeMessage(e),json("provider",provider));
            throw e;
        }
    }

    @Transactional
    public PaymentResultResponse cancel(UUID paymentId,String email){
        Payment p=ownedForUpdate(paymentId,email);PaymentStatus before=p.getStatus();
        if(!PaymentRetryRules.canCancel(before))throw new ApiException(HttpStatus.CONFLICT,"Chỉ payment PENDING mới có thể hủy lần thanh toán");
        p.setStatus(PaymentStatus.CANCELLED);p.setCancelledAt(Instant.now());p.setNextReconcileAt(null);p.setProviderResponseCode("USER_CANCELLED");p.setProviderMessage("Người dùng hủy lần thanh toán; booking vẫn được giữ đến khi hết hạn");payments.save(p);
        events.record(p.getId(),"PAYMENT_CANCELLED","USER",email,before.name(),p.getStatus().name(),"USER_CANCELLED",p.getProviderMessage(),null);
        return result(p);
    }

    public PaymentCheckoutResponse checkout(UUID paymentId,String email){return checkoutView(owned(paymentId,email));}
    public List<PaymentEventItem> timeline(UUID paymentId,String email){owned(paymentId,email);return events.timeline(paymentId).stream().map(this::eventView).toList();}

    public List<PaymentHistoryItem> history(String email){
        UUID payerId=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản")).getId();
        return payments.findByPayerUserIdOrderByCreatedAtDesc(payerId).stream().map(p->{
            BookingResponse b=bookingService.toDto(bookingService.entity(p.getBookingId()));
            return new PaymentHistoryItem(p.getId(),p.getBookingId(),p.getPayerUserId(),b.movieTitle(),p.getProvider(),p.getStatus().name(),p.getAmount(),p.getRefundedAmount(),p.getRefundReference(),p.getProviderOrderId(),p.getProviderTransactionId(),p.getProviderResponseCode(),p.getProviderMessage(),p.getCreatedAt(),p.getUpdatedAt(),p.getExpiresAt(),p.getPaidAt(),p.getFailedAt(),p.getCancelledAt(),p.getRefundedAt(),n(p.getAttemptNo(),1),p.getRetryOfPaymentId(),p.getLastReconciledAt(),p.getNextReconcileAt(),n(p.getReconciliationFailures(),0));
        }).toList();
    }

    public List<ProviderAvailability> providers(){
        return List.of(
            new ProviderAvailability("MOCK","Thanh toán nội bộ (MOCK)",mockEnabled,true,true,"local",List.of("redirect","idempotency","retry","cancel"),mockEnabled?"Sẵn sàng cho local/CI":"Đã tắt bằng cấu hình"),
            new ProviderAvailability("VNPAY","VNPay",vnPay.configured(),vnPay.configured(),false,vnPay.mode(),List.of("redirect","qr","ipn","query","idempotency","retry","cancel"),vnPay.configured()?"Đã có merchant credentials":"Chưa cấu hình merchant credentials"),
            new ProviderAvailability("MOMO","MoMo",momo.configured(),momo.configured(),false,momo.mode(),List.of("redirect","qr","deeplink","ipn","query","idempotency","retry","cancel"),momo.configured()?"Đã có merchant credentials":"Chưa cấu hình merchant credentials")
        );
    }

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
        fail(p,"MOCK_FAILED","Mock failure",false,"SYSTEM",null);return result(payments.findById(p.getId()).orElseThrow());
    }

    @Transactional
    public Map<String,String> vnPayIpn(Map<String,String> params){
        boolean signatureValid=vnPay.verify(params);String orderId=params.getOrDefault("vnp_TxnRef","");
        Payment p=payments.findByProviderInAndProviderOrderId(List.of("VNPAY","VNPAY_QR"),orderId).orElse(null);
        String eventKey=bounded(orderId+":"+params.getOrDefault("vnp_TransactionNo","")+":"+params.getOrDefault("vnp_ResponseCode","")+":"+params.getOrDefault("vnp_TransactionStatus",""),240);
        String resultCode=params.getOrDefault("vnp_ResponseCode","");String payloadHash=CryptoUtil.sha256(CryptoUtil.canonicalMap(params));
        if(!signatureValid){String rejectedKey=rejectedWebhookKey("signature",payloadHash);WebhookClaim claim=claimWebhook("VNPAY",rejectedKey,p,payloadHash,false,resultCode);if(claim!=WebhookClaim.NEW)return previousVnPayResponse(rejectedKey);if(p!=null)events.record(p.getId(),"WEBHOOK_REJECTED","GATEWAY","VNPAY",p.getStatus().name(),p.getStatus().name(),"INVALID_SIGNATURE","VNPay IPN bị từ chối do chữ ký không hợp lệ",json("payloadHash",payloadHash));return finishVnPay(rejectedKey,p,"97","Invalid checksum");}
        if(!vnPay.merchantMatches(params)){String rejectedKey=rejectedWebhookKey("merchant",payloadHash);WebhookClaim claim=claimWebhook("VNPAY",rejectedKey,p,payloadHash,true,resultCode);if(claim!=WebhookClaim.NEW)return previousVnPayResponse(rejectedKey);if(p!=null)events.record(p.getId(),"WEBHOOK_REJECTED","GATEWAY","VNPAY",p.getStatus().name(),p.getStatus().name(),"INVALID_MERCHANT","VNPay IPN bị từ chối do merchant identity không khớp",json("payloadHash",payloadHash));return finishVnPay(rejectedKey,p,"97","Invalid merchant");}
        if(p==null){WebhookClaim claim=claimWebhook("VNPAY",eventKey,null,payloadHash,true,resultCode);if(claim==WebhookClaim.CONFLICT)return Map.of("RspCode","97","Message","Replay payload mismatch");if(claim==WebhookClaim.DUPLICATE)return previousVnPayResponse(eventKey);return finishVnPay(eventKey,null,"01","Order not found");}
        if(!validVnPayAmount(p,params)){String rejectedKey=rejectedWebhookKey("amount",payloadHash);WebhookClaim claim=claimWebhook("VNPAY",rejectedKey,p,payloadHash,true,resultCode);if(claim!=WebhookClaim.NEW)return previousVnPayResponse(rejectedKey);events.record(p.getId(),"WEBHOOK_REJECTED","GATEWAY","VNPAY",p.getStatus().name(),p.getStatus().name(),"INVALID_AMOUNT","VNPay IPN bị từ chối do amount mismatch",json("payloadHash",payloadHash));return finishVnPay(rejectedKey,p,"04","Invalid amount");}
        WebhookClaim claim=claimWebhook("VNPAY",eventKey,p,payloadHash,true,resultCode);
        if(claim==WebhookClaim.CONFLICT){recordReplayConflict(p,"VNPAY",eventKey,payloadHash);return Map.of("RspCode","97","Message","Replay payload mismatch");}
        if(claim==WebhookClaim.DUPLICATE)return previousVnPayResponse(eventKey);
        p.setLastWebhookAt(Instant.now());p.setProviderResponseCode(resultCode);p.setProviderMessage(params.getOrDefault("vnp_TransactionStatus",""));payments.save(p);
        if(p.getStatus()==PaymentStatus.SUCCESS)return finishVnPay(eventKey,p,"02","Order already confirmed");
        String transactionStatus=params.getOrDefault("vnp_TransactionStatus","");
        if("00".equals(resultCode)&&"00".equals(transactionStatus)){success(p,params.getOrDefault("vnp_TransactionNo",orderId),resultCode,"VNPAY success");return finishVnPay(eventKey,p,"00","Confirm Success");}
        if("01".equals(transactionStatus)){scheduleReconcile(p,"VNPay pending IPN");events.record(p.getId(),"WEBHOOK_PENDING","GATEWAY","VNPAY",p.getStatus().name(),p.getStatus().name(),transactionStatus,"VNPay IPN đang xử lý",json("eventKey",eventKey));return finishVnPay(eventKey,p,"00","Pending status recorded");}
        if(Set.of("04","05","06").contains(transactionStatus)){PaymentStatus before=p.getStatus();p.setStatus(PaymentStatus.REVIEW);p.setProviderResponseCode(resultCode+"/"+transactionStatus);p.setProviderMessage("VNPAY status requires reconciliation: "+transactionStatus);scheduleReconcile(p,p.getProviderMessage());payments.save(p);events.record(p.getId(),"PAYMENT_REVIEW_REQUIRED","GATEWAY","VNPAY",before.name(),p.getStatus().name(),transactionStatus,p.getProviderMessage(),json("eventKey",eventKey));return finishVnPay(eventKey,p,"00","Review status recorded");}
        fail(p,resultCode,"VNPAY transaction status "+transactionStatus,false,"GATEWAY","VNPAY");return finishVnPay(eventKey,p,"00","Payment failed recorded");
    }

    @Transactional
    public Map<String,Object> momoIpn(Map<String,Object> params){
        boolean signatureValid=momo.verifyIpn(params);String orderId=String.valueOf(params.getOrDefault("orderId",""));
        Payment p=payments.findByProviderInAndProviderOrderId(List.of("MOMO","MOMO_QR"),orderId).orElse(null);String code=String.valueOf(params.getOrDefault("resultCode","-1"));
        String eventKey=bounded(orderId+":"+String.valueOf(params.getOrDefault("transId",""))+":"+code,240);String payloadHash=CryptoUtil.sha256(CryptoUtil.canonicalMap(params));
        if(!signatureValid){String rejectedKey=rejectedWebhookKey("signature",payloadHash);WebhookClaim claim=claimWebhook("MOMO",rejectedKey,p,payloadHash,false,code);if(claim!=WebhookClaim.NEW)return previousMomoResponse(rejectedKey);if(p!=null)events.record(p.getId(),"WEBHOOK_REJECTED","GATEWAY","MOMO",p.getStatus().name(),p.getStatus().name(),"INVALID_SIGNATURE","MoMo IPN bị từ chối do chữ ký không hợp lệ",json("payloadHash",payloadHash));return finishMomo(rejectedKey,p,97,"Invalid signature");}
        if(!momo.merchantMatches(params)){String rejectedKey=rejectedWebhookKey("merchant",payloadHash);WebhookClaim claim=claimWebhook("MOMO",rejectedKey,p,payloadHash,true,code);if(claim!=WebhookClaim.NEW)return previousMomoResponse(rejectedKey);if(p!=null)events.record(p.getId(),"WEBHOOK_REJECTED","GATEWAY","MOMO",p.getStatus().name(),p.getStatus().name(),"INVALID_MERCHANT","MoMo IPN bị từ chối do merchant identity không khớp",json("payloadHash",payloadHash));return finishMomo(rejectedKey,p,97,"Invalid merchant");}
        if(p==null){WebhookClaim claim=claimWebhook("MOMO",eventKey,null,payloadHash,true,code);if(claim==WebhookClaim.CONFLICT)return Map.of("resultCode",97,"message","replay payload mismatch");if(claim==WebhookClaim.DUPLICATE)return previousMomoResponse(eventKey);return finishMomo(eventKey,null,1,"Order not found");}
        if(!validMomoAmount(p,params)){String rejectedKey=rejectedWebhookKey("amount",payloadHash);WebhookClaim claim=claimWebhook("MOMO",rejectedKey,p,payloadHash,true,code);if(claim!=WebhookClaim.NEW)return previousMomoResponse(rejectedKey);events.record(p.getId(),"WEBHOOK_REJECTED","GATEWAY","MOMO",p.getStatus().name(),p.getStatus().name(),"INVALID_AMOUNT","MoMo IPN bị từ chối do amount mismatch",json("payloadHash",payloadHash));return finishMomo(rejectedKey,p,1,"Invalid amount");}
        WebhookClaim claim=claimWebhook("MOMO",eventKey,p,payloadHash,true,code);
        if(claim==WebhookClaim.CONFLICT){recordReplayConflict(p,"MOMO",eventKey,payloadHash);return Map.of("resultCode",97,"message","replay payload mismatch");}
        if(claim==WebhookClaim.DUPLICATE)return previousMomoResponse(eventKey);
        p.setLastWebhookAt(Instant.now());p.setProviderResponseCode(code);p.setProviderMessage(String.valueOf(params.getOrDefault("message","")));payments.save(p);int result=parseInt(code,-1);
        if(result==0){success(p,String.valueOf(params.getOrDefault("transId",orderId)),code,String.valueOf(params.getOrDefault("message","Successful")));return finishMomo(eventKey,p,0,"success");}
        if(Set.of(7000,7002,9000).contains(result)){scheduleReconcile(p,"MoMo pending IPN");events.record(p.getId(),"WEBHOOK_PENDING","GATEWAY","MOMO",p.getStatus().name(),p.getStatus().name(),code,p.getProviderMessage(),json("eventKey",eventKey));return finishMomo(eventKey,p,0,"pending acknowledged");}
        fail(p,code,String.valueOf(params.getOrDefault("message","MoMo payment failed")),false,"GATEWAY","MOMO");return finishMomo(eventKey,p,0,"failure recorded");
    }

    public PaymentReturnResponse vnPayReturn(Map<String,String> params){boolean signatureValid=vnPay.verify(params);boolean merchantValid=signatureValid&&vnPay.merchantMatches(params);String orderId=params.getOrDefault("vnp_TxnRef","");Payment p=payments.findByProviderInAndProviderOrderId(List.of("VNPAY","VNPAY_QR"),orderId).orElse(null);boolean amountValid=p!=null&&validVnPayAmount(p,params);String message=!signatureValid?"Invalid checksum":!merchantValid?"Invalid merchant":p==null?"Order not found":!amountValid?"Invalid amount":"Return verified; waiting for server IPN is allowed";return returnView("VNPAY",p,signatureValid&&merchantValid&&p!=null&&amountValid,params.getOrDefault("vnp_ResponseCode",""),message);}
    public PaymentReturnResponse momoReturn(Map<String,Object> params){boolean signatureValid=momo.verifyIpn(params);boolean merchantValid=signatureValid&&momo.merchantMatches(params);String orderId=String.valueOf(params.getOrDefault("orderId",""));Payment p=payments.findByProviderInAndProviderOrderId(List.of("MOMO","MOMO_QR"),orderId).orElse(null);boolean amountValid=p!=null&&validMomoAmount(p,params);boolean valid=signatureValid&&merchantValid&&p!=null&&amountValid;String message=!signatureValid?"Invalid signature":!merchantValid?"Invalid merchant":p==null?"Order not found":!amountValid?"Invalid amount":"Return verified; payment state comes from server IPN/reconciliation";return returnView("MOMO",p,valid,String.valueOf(params.getOrDefault("resultCode","")),message);}

    @Transactional
    public PaymentResultResponse success(Payment input,String providerTxn,String responseCode,String message){
        Payment p=payments.findByIdForUpdate(input.getId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy payment"));PaymentStatus before=p.getStatus();
        if(p.getStatus()==PaymentStatus.SUCCESS){awardLoyaltyIfNeeded(p);finance.recordPaymentCapture(p,bookingService.entity(p.getBookingId()));return result(p);}if(p.getStatus()==PaymentStatus.REFUNDED)return result(p);
        Booking current=bookingService.entity(p.getBookingId());
        if(current.getStatus()!=BookingStatus.PENDING&&current.getStatus()!=BookingStatus.CONFIRMED){p.setStatus(PaymentStatus.REVIEW);p.setPaidAt(Instant.now());p.setProviderTransactionId(providerTxn);p.setProviderResponseCode(responseCode);p.setProviderMessage("Gateway reported success after booking became "+current.getStatus()+"; manual review/refund required");scheduleReconcile(p,p.getProviderMessage());payments.save(p);finance.recordPaymentCapture(p,current);notifications.create(current.getUserId(),"PAYMENT_REVIEW","Thanh toán cần được kiểm tra","Cổng thanh toán đã báo thành công nhưng booking "+current.getId()+" không còn ở trạng thái chờ. CineBooking sẽ cần đối soát giao dịch.","/bookings");events.record(p.getId(),"PAYMENT_REVIEW_REQUIRED","SYSTEM",null,before.name(),p.getStatus().name(),responseCode,p.getProviderMessage(),null);return result(p);}
        if(current.getExpiresAt()!=null&&current.getExpiresAt().isBefore(Instant.now())&&current.getStatus()!=BookingStatus.CONFIRMED){p.setStatus(PaymentStatus.REVIEW);p.setPaidAt(Instant.now());p.setProviderTransactionId(providerTxn);p.setProviderResponseCode(responseCode);p.setProviderMessage("Gateway success arrived after payment window expired; manual review/refund required");scheduleReconcile(p,p.getProviderMessage());payments.save(p);finance.recordPaymentCapture(p,current);events.record(p.getId(),"PAYMENT_REVIEW_REQUIRED","SYSTEM",null,before.name(),p.getStatus().name(),responseCode,p.getProviderMessage(),null);return result(p);}
        inventory.finalizeSale(p.getBookingId());Booking b=bookingService.confirm(p.getBookingId());p.setStatus(PaymentStatus.SUCCESS);p.setPaidAt(Instant.now());p.setFailedAt(null);p.setCancelledAt(null);p.setProviderTransactionId(providerTxn);p.setProviderResponseCode(responseCode);p.setProviderMessage(message);p.setNextReconcileAt(null);p.setReconciliationFailures(0);p.setLastReconcileMessage(null);awardLoyaltyIfNeeded(p);payments.save(p);finance.recordPaymentCapture(p,b);notifications.create(b.getUserId(),"PAYMENT_SUCCESS","Thanh toán thành công","Vé "+b.getId()+" đã được xác nhận. Bạn có thể mở QR vé trong mục Vé của tôi.","/ticket/"+b.getId());events.record(p.getId(),"PAYMENT_SUCCEEDED",realProvider(p.getProvider())?"GATEWAY":"SYSTEM",p.getProvider(),before.name(),p.getStatus().name(),responseCode,message,json("providerTransactionId",providerTxn));return new PaymentResultResponse(p.getId(),p.getBookingId(),p.getProvider(),p.getStatus().name(),b.getStatus().name());
    }

    @Transactional
    public int expireStale(){int count=0;for(Payment p:payments.findByStatusAndExpiresAtBefore(PaymentStatus.PENDING,Instant.now())){Payment locked=payments.findByIdForUpdate(p.getId()).orElse(null);if(locked==null||locked.getStatus()!=PaymentStatus.PENDING)continue;PaymentStatus before=locked.getStatus();locked.setStatus(PaymentStatus.EXPIRED);locked.setFailedAt(Instant.now());locked.setNextReconcileAt(null);locked.setProviderResponseCode("EXPIRED");locked.setProviderMessage("Booking payment window expired");payments.save(locked);bookingService.cancelPending(locked.getBookingId(),BookingStatus.EXPIRED);events.record(locked.getId(),"PAYMENT_EXPIRED","SYSTEM",null,before.name(),locked.getStatus().name(),"EXPIRED",locked.getProviderMessage(),null);count++;}return count;}

    private void fail(Payment input,String code,String message,boolean cancelBooking,String actorType,String actorRef){Payment p=payments.findByIdForUpdate(input.getId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy payment"));if(p.getStatus()==PaymentStatus.SUCCESS||p.getStatus()==PaymentStatus.REFUNDED)return;PaymentStatus before=p.getStatus();p.setStatus(PaymentStatus.FAILED);p.setFailedAt(Instant.now());p.setNextReconcileAt(null);p.setProviderResponseCode(code);p.setProviderMessage(message);payments.save(p);if(cancelBooking)bookingService.cancelPending(p.getBookingId(),BookingStatus.CANCELLED);events.record(p.getId(),"PAYMENT_FAILED",actorType,actorRef,before.name(),p.getStatus().name(),code,message,null);}

    private Payment owned(UUID paymentId,String email){Payment p=payments.findById(paymentId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy payment"));UUID userId=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản")).getId();if(!userId.equals(p.getPayerUserId()))throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền xem giao dịch thanh toán này");return p;}
    private Payment ownedForUpdate(UUID paymentId,String email){Payment p=payments.findByIdForUpdate(paymentId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy payment"));UUID userId=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản")).getId();if(!userId.equals(p.getPayerUserId()))throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền thao tác giao dịch thanh toán này");return p;}
    private PaymentCheckoutResponse checkoutView(Payment p){return new PaymentCheckoutResponse(p.getId(),p.getBookingId(),p.getProvider(),p.getStatus().name(),p.getAmount(),p.getCheckoutUrl(),p.getQrPayload(),p.getDeeplink(),p.getProviderOrderId(),p.getProviderTransactionId(),p.getProviderResponseCode(),p.getProviderMessage(),p.getCreatedAt(),p.getUpdatedAt(),p.getExpiresAt(),p.getPaidAt(),p.getFailedAt(),p.getCancelledAt(),n(p.getAttemptNo(),1),p.getRetryOfPaymentId(),p.getLastReconciledAt(),p.getNextReconcileAt(),n(p.getReconciliationFailures(),0),p.getLastReconcileMessage());}
    private PaymentStartResponse startResponse(Payment p,boolean replayed){String url="MOMO_QR".equals(p.getProvider())?"/payment/qr?paymentId="+p.getId():p.getCheckoutUrl();if("BALANCE".equals(p.getProvider())||p.getStatus()==PaymentStatus.SUCCESS||p.getStatus()==PaymentStatus.REFUNDED||p.getStatus()==PaymentStatus.REVIEW)url="/bookings";return new PaymentStartResponse(p.getId(),p.getBookingId(),p.getProvider(),url,p.getQrPayload(),p.getDeeplink(),p.getExpiresAt(),replayed,n(p.getAttemptNo(),1),p.getRetryOfPaymentId());}
    private PaymentReturnResponse returnView(String provider,Payment p,boolean valid,String code,String message){if(p==null)return new PaymentReturnResponse(valid,provider,null,null,null,null,code,message);Booking b=bookingService.entity(p.getBookingId());return new PaymentReturnResponse(valid,provider,p.getId(),p.getBookingId(),p.getStatus().name(),b.getStatus().name(),code,message);}
    private PaymentEventItem eventView(PaymentEvent e){return new PaymentEventItem(e.getId(),e.getPaymentId(),e.getEventType(),e.getActorType(),e.getActorRef(),e.getFromStatus(),e.getToStatus(),e.getCode(),e.getMessage(),e.getDetailsJson(),e.getCreatedAt());}
    private boolean validVnPayAmount(Payment p,Map<String,String> params){try{return p.getAmount().movePointRight(2).longValueExact()==Long.parseLong(params.getOrDefault("vnp_Amount","-1"));}catch(Exception e){return false;}}
    private boolean validMomoAmount(Payment p,Map<String,Object> params){try{return p.getAmount().longValueExact()==Long.parseLong(String.valueOf(params.getOrDefault("amount","-1")));}catch(Exception e){return false;}}
    private enum WebhookClaim { NEW, DUPLICATE, CONFLICT }
    private WebhookClaim claimWebhook(String provider,String eventKey,Payment p,String payloadHash,boolean signatureValid,String resultCode){
        if(webhooks.claim(UUID.randomUUID(),provider,eventKey,p==null?null:p.getId(),payloadHash,signatureValid,resultCode,Instant.now())==1)return WebhookClaim.NEW;
        return webhooks.findByProviderAndEventKey(provider,eventKey)
                .map(existing->CryptoUtil.constantTimeEquals(existing.getPayloadHash(),payloadHash)?WebhookClaim.DUPLICATE:WebhookClaim.CONFLICT)
                .orElse(WebhookClaim.CONFLICT);
    }
    private void recordReplayConflict(Payment p,String provider,String eventKey,String payloadHash){events.record(p.getId(),"WEBHOOK_REPLAY_CONFLICT","GATEWAY",provider,p.getStatus().name(),p.getStatus().name(),"PAYLOAD_MISMATCH","Webhook event key bị replay với payload khác; trạng thái payment không được thay đổi",json("eventKey",eventKey+"#"+payloadHash));}
    private Map<String,String> previousVnPayResponse(String eventKey){return webhooks.findByProviderAndEventKey("VNPAY",eventKey).map(e->Map.of("RspCode",e.getResponseCode()==null?"02":e.getResponseCode(),"Message",e.getResponseMessage()==null?"Duplicate notification":e.getResponseMessage())).orElse(Map.of("RspCode","02","Message","Duplicate notification"));}
    private Map<String,Object> previousMomoResponse(String eventKey){return webhooks.findByProviderAndEventKey("MOMO",eventKey).map(e->{int code=parseInt(e.getResponseCode(),0);return Map.<String,Object>of("resultCode",code,"message",e.getResponseMessage()==null?"duplicate acknowledged":e.getResponseMessage());}).orElse(Map.of("resultCode",0,"message","duplicate acknowledged"));}
    private Map<String,String> finishVnPay(String eventKey,Payment p,String code,String message){finishWebhook("VNPAY",eventKey,p,code,message);return Map.of("RspCode",code,"Message",message);}
    private Map<String,Object> finishMomo(String eventKey,Payment p,int code,String message){finishWebhook("MOMO",eventKey,p,String.valueOf(code),message);return Map.of("resultCode",code,"message",message);}
    private String rejectedWebhookKey(String reason,String payloadHash){return bounded("rejected:"+reason+":"+payloadHash,240);}
    private void finishWebhook(String provider,String eventKey,Payment p,String code,String message){webhooks.findByProviderAndEventKey(provider,eventKey).ifPresent(e->{e.setPaymentId(p==null?e.getPaymentId():p.getId());e.setResponseCode(code);e.setResponseMessage(message);e.setProcessedAt(Instant.now());webhooks.save(e);});}
    private String normalizeProvider(String raw){if(raw==null||raw.isBlank())throw new ApiException(HttpStatus.BAD_REQUEST,"provider không hợp lệ");String v=raw.trim().toUpperCase(Locale.ROOT);if(!Set.of("MOCK","VNPAY","VNPAY_QR","MOMO","MOMO_QR").contains(v))throw new ApiException(HttpStatus.BAD_REQUEST,"provider không hợp lệ");return v;}
    private void ensureProviderAvailable(String provider){if("MOCK".equals(provider)&&!mockEnabled)throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"Thanh toán MOCK đã bị tắt trên môi trường này");if(provider.startsWith("VNPAY")&&!vnPay.configured())throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"VNPay chưa được cấu hình merchant credentials");if(provider.startsWith("MOMO")&&!momo.configured())throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"MoMo chưa được cấu hình merchant credentials");productionReadiness.ensureAllowed(provider);}
    private boolean realProvider(String provider){return provider!=null&&(provider.startsWith("VNPAY")||provider.startsWith("MOMO"));}
    private void scheduleReconcile(Payment p,String message){if(realProvider(p.getProvider())){p.setNextReconcileAt(Instant.now().plusSeconds(reconcileMinAgeSeconds));p.setLastReconcileMessage(message);}}
    private String normalizeIdempotencyKey(String key){if(key==null||key.isBlank())return null;String v=key.trim();if(v.length()>120)throw new ApiException(HttpStatus.BAD_REQUEST,"Idempotency-Key tối đa 120 ký tự");if(!v.matches("[A-Za-z0-9._:-]+"))throw new ApiException(HttpStatus.BAD_REQUEST,"Idempotency-Key chứa ký tự không hợp lệ");return v;}
    private int parseInt(String value,int fallback){try{return Integer.parseInt(value);}catch(Exception e){return fallback;}}
    private int n(Integer value,int fallback){return value==null?fallback:value;}
    private String bounded(String value,int max){if(value==null)return null;return value.length()<=max?value:value.substring(0,max);}
    private String safeMessage(Throwable e){String m=e.getMessage();return m==null||m.isBlank()?e.getClass().getSimpleName():bounded(m,450);}
    private String json(String key,String value){return "{\""+key+"\":\""+(value==null?"":value.replace("\\","\\\\").replace("\"","\\\""))+"\"}";}
    private void awardLoyaltyIfNeeded(Payment p){if(p.getLoyaltyPointsAwarded()!=null&&p.getLoyaltyPointsAwarded()>0)return;Booking booking=bookingService.entity(p.getBookingId());UUID benefitOwner=booking.getPurchaserUserId()==null?booking.getUserId():booking.getPurchaserUserId();int points=loyalty.awardForPayment(benefitOwner,booking.getId(),p.getAmount());p.setLoyaltyPointsAwarded(points);}
    private PaymentResultResponse result(Payment p){Booking b=bookingService.entity(p.getBookingId());return new PaymentResultResponse(p.getId(),p.getBookingId(),p.getProvider(),p.getStatus().name(),b.getStatus().name());}
}
