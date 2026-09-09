package com.cinebooking.payment;

import com.cinebooking.audit.AuditService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.Payment;
import com.cinebooking.domain.PaymentWebhookEvent;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import static com.cinebooking.payment.PaymentResilienceDtos.*;

@Service
public class PaymentWebhookRecoveryService {
    private static final List<String> RECOVERABLE_STATES=List.of("RECEIVED","ORPHANED","RECOVERY_PENDING");
    private final PaymentWebhookEventRepository webhooks;
    private final PaymentRepository payments;
    private final AdminPaymentService adminPayments;
    private final AuditService audit;
    private final int maxAttempts;
    private final int maxBatch;
    private final long minAgeSeconds;
    private final long maxBackoffSeconds;

    public PaymentWebhookRecoveryService(PaymentWebhookEventRepository webhooks,
                                         PaymentRepository payments,
                                         AdminPaymentService adminPayments,
                                         AuditService audit,
                                         @Value("${app.payment.webhook-recovery.max-attempts:5}") int maxAttempts,
                                         @Value("${app.payment.webhook-recovery.max-batch:20}") int maxBatch,
                                         @Value("${app.payment.webhook-recovery.min-age-seconds:30}") long minAgeSeconds,
                                         @Value("${app.payment.webhook-recovery.max-backoff-seconds:900}") long maxBackoffSeconds){
        this.webhooks=webhooks;this.payments=payments;this.adminPayments=adminPayments;this.audit=audit;
        this.maxAttempts=Math.max(1,Math.min(20,maxAttempts));
        this.maxBatch=Math.max(1,Math.min(100,maxBatch));
        this.minAgeSeconds=Math.max(10,minAgeSeconds);
        this.maxBackoffSeconds=Math.max(this.minAgeSeconds,maxBackoffSeconds);
    }

    @Transactional
    public WebhookRecoveryResult recover(UUID webhookId,String actor,String ip,String trigger){
        PaymentWebhookEvent event=webhooks.findByIdForUpdate(webhookId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy webhook event"));
        if(!event.isSignatureValid()||"REJECTED".equals(event.getDeliveryState())){
            throw new ApiException(HttpStatus.BAD_REQUEST,"Webhook bị từ chối không được phép recovery");
        }
        if("RECOVERED".equals(event.getDeliveryState())) return result(event,true,true,"Webhook đã recovery trước đó",null);

        int attempts=n(event.getRecoveryAttempts())+1;
        event.setRecoveryAttempts(attempts);
        event.setLastRecoveryAt(Instant.now());

        Payment payment=resolvePayment(event);
        if(payment==null){
            String message="Không tìm thấy payment theo provider order trong webhook event";
            failOrRetry(event,message);
            webhooks.save(event);
            audit.record(actor,"PAYMENT_WEBHOOK_RECOVERY_MISS","PAYMENT_WEBHOOK_EVENT",event.getId().toString(),message,ip);
            return result(event,false,false,message,null);
        }

        event.setPaymentId(payment.getId());
        event.setDeliveryState("RECOVERY_PENDING");
        event.setRecoveryMessage("Đã liên kết payment; đang đối soát an toàn với gateway");
        webhooks.save(event);

        AdminPaymentDtos.ReconciliationResult reconciliation=adminPayments.reconcile(payment.getId(),actor,ip,trigger);
        if(reconciliation.success()){
            event.setDeliveryState("RECOVERED");
            event.setRecoveredAt(Instant.now());
            event.setRecoveryMessage(bounded("Recovered by provider reconciliation: "+reconciliation.message()));
            webhooks.save(event);
            audit.record(actor,"PAYMENT_WEBHOOK_RECOVERED","PAYMENT_WEBHOOK_EVENT",event.getId().toString(),"payment="+payment.getId()+", trigger="+trigger,ip);
            return result(event,true,true,event.getRecoveryMessage(),reconciliation);
        }

        failOrRetry(event,reconciliation.message());
        webhooks.save(event);
        audit.record(actor,"PAYMENT_WEBHOOK_RECOVERY_FAILED","PAYMENT_WEBHOOK_EVENT",event.getId().toString(),"payment="+payment.getId()+", state="+event.getDeliveryState()+", trigger="+trigger,ip);
        return result(event,true,false,event.getRecoveryMessage(),reconciliation);
    }

    @Transactional
    public WebhookRecoveryBatchResult recoverDue(String actor,String ip,String trigger){
        List<PaymentWebhookEvent> candidates=webhooks.findByDeliveryStateInAndSignatureValidTrueOrderByReceivedAtAsc(RECOVERABLE_STATES,PageRequest.of(0,maxBatch*3));
        List<WebhookRecoveryResult> results=new ArrayList<>();
        int recovered=0,pending=0,dead=0,scanned=0;
        for(PaymentWebhookEvent e:candidates){
            if(scanned>=maxBatch)break;
            if(!due(e,Instant.now()))continue;
            scanned++;
            WebhookRecoveryResult r=recover(e.getId(),actor,ip,trigger);
            results.add(r);
            if(r.recovered())recovered++;
            else if("DEAD_LETTER".equals(r.deliveryState()))dead++;
            else pending++;
        }
        return new WebhookRecoveryBatchResult(scanned,recovered,pending,dead,results);
    }

    public List<WebhookRecoveryItem> queue(){
        return webhooks.findByDeliveryStateInAndSignatureValidTrueOrderByReceivedAtAsc(List.of("RECEIVED","ORPHANED","RECOVERY_PENDING","DEAD_LETTER"),PageRequest.of(0,50)).stream().map(this::view).toList();
    }

    private Payment resolvePayment(PaymentWebhookEvent event){
        if(event.getPaymentId()!=null){
            Payment direct=payments.findById(event.getPaymentId()).orElse(null);
            if(direct!=null)return direct;
        }
        String orderId=orderId(event.getEventKey());
        if(orderId==null)return null;
        String provider=event.getProvider()==null?"":event.getProvider().toUpperCase(Locale.ROOT);
        if(provider.startsWith("VNPAY"))return payments.findByProviderInAndProviderOrderId(List.of("VNPAY","VNPAY_QR"),orderId).orElse(null);
        if(provider.startsWith("MOMO"))return payments.findByProviderInAndProviderOrderId(List.of("MOMO","MOMO_QR"),orderId).orElse(null);
        return null;
    }

    private String orderId(String eventKey){
        if(eventKey==null||eventKey.isBlank()||eventKey.startsWith("rejected:"))return null;
        int i=eventKey.indexOf(':');
        String value=(i<0?eventKey:eventKey.substring(0,i)).trim();
        return value.isBlank()?null:value;
    }

    private void failOrRetry(PaymentWebhookEvent event,String message){
        event.setRecoveryMessage(bounded(message));
        event.setDeliveryState(n(event.getRecoveryAttempts())>=maxAttempts?"DEAD_LETTER":"RECOVERY_PENDING");
    }

    private boolean due(PaymentWebhookEvent event,Instant now){
        Instant base=event.getLastRecoveryAt()==null?event.getReceivedAt():event.getLastRecoveryAt();
        int previous=Math.max(0,n(event.getRecoveryAttempts())-1);
        long wait=Math.min(maxBackoffSeconds,minAgeSeconds*(1L<<Math.min(5,previous)));
        return base==null||Duration.between(base,now).getSeconds()>=wait;
    }

    private WebhookRecoveryResult result(PaymentWebhookEvent e,boolean linked,boolean recovered,String message,AdminPaymentDtos.ReconciliationResult reconciliation){
        return new WebhookRecoveryResult(e.getId(),e.getPaymentId(),e.getProvider(),e.getDeliveryState(),n(e.getRecoveryAttempts()),linked,recovered,message,reconciliation);
    }
    private WebhookRecoveryItem view(PaymentWebhookEvent e){return new WebhookRecoveryItem(e.getId(),e.getProvider(),e.getEventKey(),e.getPaymentId(),e.isSignatureValid(),e.getDeliveryState(),n(e.getRecoveryAttempts()),e.getRecoveryMessage(),e.getReceivedAt(),e.getProcessedAt(),e.getLastRecoveryAt(),e.getRecoveredAt());}
    private int n(Integer v){return v==null?0:v;}
    private String bounded(String v){if(v==null)return null;return v.length()<=500?v:v.substring(0,500);}
}
