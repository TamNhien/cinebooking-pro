package com.cinebooking.payment;

import com.cinebooking.audit.AuditService;
import com.cinebooking.booking.BookingService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import static com.cinebooking.payment.AdminPaymentDtos.*;
import static com.cinebooking.payment.PaymentDtos.*;

@Service
public class AdminPaymentService {
    private final PaymentRepository payments;private final PaymentWebhookEventRepository webhooks;private final VnPayGateway vnPay;private final MomoGateway momo;private final PaymentService paymentService;private final BookingService bookings;private final AuditService audit;private final PaymentEventService events;
    private final int maxBatch;private final long minAgeSeconds;private final long maxBackoffSeconds;
    public AdminPaymentService(PaymentRepository payments,PaymentWebhookEventRepository webhooks,VnPayGateway vnPay,MomoGateway momo,PaymentService paymentService,BookingService bookings,AuditService audit,PaymentEventService events,@Value("${app.payment.reconcile.max-batch:20}") int maxBatch,@Value("${app.payment.reconcile.min-age-seconds:45}") long minAgeSeconds,@Value("${app.payment.reconcile.max-backoff-seconds:900}") long maxBackoffSeconds){this.payments=payments;this.webhooks=webhooks;this.vnPay=vnPay;this.momo=momo;this.paymentService=paymentService;this.bookings=bookings;this.audit=audit;this.events=events;this.maxBatch=Math.max(1,Math.min(100,maxBatch));this.minAgeSeconds=Math.max(15,minAgeSeconds);this.maxBackoffSeconds=Math.max(this.minAgeSeconds,maxBackoffSeconds);}

    public PaymentOpsDashboard dashboard(){
        List<Payment> rows=payments.findTop200ByOrderByCreatedAtDesc();List<PaymentWebhookEvent> hookRows=webhooks.findTop100ByOrderByReceivedAtDesc();
        return new PaymentOpsDashboard(rows.size(),count(rows,PaymentStatus.PENDING),count(rows,PaymentStatus.SUCCESS),count(rows,PaymentStatus.FAILED),count(rows,PaymentStatus.EXPIRED),count(rows,PaymentStatus.CANCELLED),count(rows,PaymentStatus.REVIEW),count(rows,PaymentStatus.REFUNDED),hookRows.stream().filter(e->!e.isSignatureValid()).count(),hookRows.size(),payments.countByNextReconcileAtIsNotNullAndNextReconcileAtLessThanEqual(Instant.now()),paymentService.providers(),rows.stream().map(this::view).toList(),hookRows.stream().map(this::view).toList());
    }

    @Transactional
    public ReconciliationResult reconcile(UUID paymentId,String actor,String ip,String trigger){
        Payment p=payments.findByIdForUpdate(paymentId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy payment"));
        String provider=p.getProvider();PaymentStatus before=p.getStatus();String providerStatus=p.getProviderResponseCode();String message="Local provider; no remote reconciliation";boolean changed=false;
        try{
            if(provider.startsWith("VNPAY")){
                var r=vnPay.query(p,ip);if(!r.signatureValid())throw new ApiException(HttpStatus.BAD_GATEWAY,"VNPAY query trả về chữ ký không hợp lệ");
                long expected=p.getAmount().movePointRight(2).longValueExact();if(r.amount()!=-1&&r.amount()!=expected)throw new ApiException(HttpStatus.CONFLICT,"VNPAY reconciliation amount mismatch");
                providerStatus=r.transactionStatus();message=r.message();p.setProviderResponseCode(r.responseCode()+"/"+r.transactionStatus());p.setProviderMessage(r.message());int state=vnPayState(r.responseCode(),r.transactionStatus());
                if(state==1){paymentService.success(p,r.transactionNo(),r.responseCode(),"Reconciled from VNPAY: "+r.message());changed=before!=PaymentStatus.SUCCESS;}
                else if(state==2&&p.getStatus()!=PaymentStatus.SUCCESS&&p.getStatus()!=PaymentStatus.REFUNDED){p.setStatus(PaymentStatus.REVIEW);changed=before!=PaymentStatus.REVIEW;}
                else if(state==3&&p.getStatus()==PaymentStatus.PENDING){p.setStatus(PaymentStatus.FAILED);p.setFailedAt(Instant.now());changed=true;}
            }else if(provider.startsWith("MOMO")){
                var r=momo.query(p);long expected=p.getAmount().longValueExact();if(r.amount()!=-1&&r.amount()!=expected)throw new ApiException(HttpStatus.CONFLICT,"MoMo reconciliation amount mismatch");
                providerStatus=r.resultCode();message=r.message();p.setProviderResponseCode(r.resultCode());p.setProviderMessage(r.message());int code=parse(r.resultCode());
                if(code==0){paymentService.success(p,r.transactionId(),r.resultCode(),"Reconciled from MoMo: "+r.message());changed=before!=PaymentStatus.SUCCESS;}
                else if(Set.of(7000,7002,9000).contains(code)){if(p.getStatus()==PaymentStatus.REVIEW)changed=false;}
                else if(p.getStatus()==PaymentStatus.PENDING){p.setStatus(PaymentStatus.FAILED);p.setFailedAt(Instant.now());changed=true;}
            }else{
                message="Provider "+provider+" là local; không có remote query";
            }
            Payment current=payments.findById(paymentId).orElseThrow();current.setLastReconciledAt(Instant.now());current.setReconciliationFailures(0);current.setLastReconcileMessage(message);current.setNextReconcileAt(shouldSchedule(current)?Instant.now().plusSeconds(minAgeSeconds):null);payments.save(current);
            String actorType="AUTO".equalsIgnoreCase(trigger)?"SYSTEM":"ADMIN";events.record(paymentId,"PAYMENT_RECONCILED",actorType,actor,before.name(),current.getStatus().name(),providerStatus,message,json("trigger",trigger));audit.record(actor,"PAYMENT_RECONCILE","PAYMENT",paymentId.toString(),provider+" trigger="+trigger+" providerStatus="+providerStatus+" localStatus="+current.getStatus(),ip);
            return new ReconciliationResult(paymentId,provider,current.getStatus().name(),providerStatus,current.getProviderTransactionId(),message,changed,true,trigger);
        }catch(RuntimeException e){
            int failures=(p.getReconciliationFailures()==null?0:p.getReconciliationFailures())+1;long backoff=Math.min(maxBackoffSeconds,minAgeSeconds*(1L<<Math.min(5,failures-1)));String error=safe(e);
            p.setLastReconciledAt(Instant.now());p.setReconciliationFailures(failures);p.setLastReconcileMessage(error);p.setNextReconcileAt(shouldSchedule(p)?Instant.now().plusSeconds(backoff):null);payments.save(p);
            String actorType="AUTO".equalsIgnoreCase(trigger)?"SYSTEM":"ADMIN";events.record(paymentId,"PAYMENT_RECONCILE_FAILED",actorType,actor,before.name(),p.getStatus().name(),"QUERY_FAILED",error,json("trigger",trigger));audit.record(actor,"PAYMENT_RECONCILE_FAILED","PAYMENT",paymentId.toString(),provider+" trigger="+trigger+" error="+error,ip);
            return new ReconciliationResult(paymentId,provider,p.getStatus().name(),"ERROR",p.getProviderTransactionId(),error,false,false,trigger);
        }
    }

    @Transactional
    public BatchReconciliationResult reconcileDue(String actor,String ip,String trigger){
        List<Payment> due=payments.findDueForReconciliation(List.of("VNPAY","VNPAY_QR","MOMO","MOMO_QR"),List.of(PaymentStatus.PENDING,PaymentStatus.REVIEW),Instant.now(),PageRequest.of(0,maxBatch));List<ReconciliationResult> results=new ArrayList<>();int success=0;
        for(Payment p:due){ReconciliationResult r=reconcile(p.getId(),actor,ip,trigger);results.add(r);if(r.success())success++;}
        return new BatchReconciliationResult(due.size(),success,due.size()-success,results);
    }

    public PaymentTimelineAdmin timeline(UUID paymentId){if(!payments.existsById(paymentId))throw new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy payment");return new PaymentTimelineAdmin(paymentId,events.timeline(paymentId).stream().map(this::eventView).toList());}

    private boolean shouldSchedule(Payment p){return (p.getStatus()==PaymentStatus.PENDING||p.getStatus()==PaymentStatus.REVIEW)&&(p.getProvider().startsWith("VNPAY")||p.getProvider().startsWith("MOMO"));}
    private int vnPayState(String response,String transaction){if("00".equals(response)&&"00".equals(transaction))return 1;if(Set.of("04","05","06").contains(transaction))return 2;if(!"01".equals(transaction))return 3;return 0;}
    private long count(List<Payment> rows,PaymentStatus status){return rows.stream().filter(p->p.getStatus()==status).count();}
    private int parse(String s){try{return Integer.parseInt(s);}catch(Exception e){return -1;}}
    private int n(Integer x,int fallback){return x==null?fallback:x;}
    private String safe(Throwable e){String m=e.getMessage();if(m==null||m.isBlank())m=e.getClass().getSimpleName();return m.length()>450?m.substring(0,450):m;}
    private String json(String k,String v){return "{\""+k+"\":\""+(v==null?"":v.replace("\\","\\\\").replace("\"","\\\""))+"\"}";}
    private PaymentAdminView view(Payment p){return new PaymentAdminView(p.getId(),p.getBookingId(),p.getPayerUserId(),p.getProvider(),p.getStatus().name(),p.getAmount(),p.getProviderOrderId(),p.getProviderTransactionId(),p.getProviderResponseCode(),p.getProviderMessage(),p.getCreatedAt(),p.getUpdatedAt(),p.getExpiresAt(),p.getPaidAt(),p.getFailedAt(),p.getCancelledAt(),p.getLastWebhookAt(),n(p.getAttemptNo(),1),p.getRetryOfPaymentId(),p.getLastReconciledAt(),p.getNextReconcileAt(),n(p.getReconciliationFailures(),0),p.getLastReconcileMessage());}
    private WebhookAdminView view(PaymentWebhookEvent e){return new WebhookAdminView(e.getId(),e.getProvider(),e.getEventKey(),e.getPaymentId(),e.getPayloadHash(),e.isSignatureValid(),e.getResultCode(),e.getResponseCode(),e.getResponseMessage(),e.getReceivedAt(),e.getProcessedAt());}
    private PaymentEventItem eventView(PaymentEvent e){return new PaymentEventItem(e.getId(),e.getPaymentId(),e.getEventType(),e.getActorType(),e.getActorRef(),e.getFromStatus(),e.getToStatus(),e.getCode(),e.getMessage(),e.getDetailsJson(),e.getCreatedAt());}
}
