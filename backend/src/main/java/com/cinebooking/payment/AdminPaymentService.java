package com.cinebooking.payment;

import com.cinebooking.audit.AuditService;
import com.cinebooking.booking.BookingService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import static com.cinebooking.payment.AdminPaymentDtos.*;

@Service
public class AdminPaymentService {
    private final PaymentRepository payments;private final PaymentWebhookEventRepository webhooks;private final VnPayGateway vnPay;private final MomoGateway momo;private final PaymentService paymentService;private final BookingService bookings;private final AuditService audit;
    public AdminPaymentService(PaymentRepository payments,PaymentWebhookEventRepository webhooks,VnPayGateway vnPay,MomoGateway momo,PaymentService paymentService,BookingService bookings,AuditService audit){this.payments=payments;this.webhooks=webhooks;this.vnPay=vnPay;this.momo=momo;this.paymentService=paymentService;this.bookings=bookings;this.audit=audit;}

    public PaymentOpsDashboard dashboard(){
        List<Payment> rows=payments.findTop200ByOrderByCreatedAtDesc();List<PaymentWebhookEvent> events=webhooks.findTop100ByOrderByReceivedAtDesc();
        return new PaymentOpsDashboard(rows.size(),count(rows,PaymentStatus.PENDING),count(rows,PaymentStatus.SUCCESS),count(rows,PaymentStatus.FAILED),count(rows,PaymentStatus.EXPIRED),count(rows,PaymentStatus.REVIEW),count(rows,PaymentStatus.REFUNDED),events.stream().filter(e->!e.isSignatureValid()).count(),events.size(),rows.stream().map(this::view).toList(),events.stream().map(this::view).toList());
    }

    @Transactional
    public ReconciliationResult reconcile(UUID paymentId,String adminEmail,String ip){
        Payment p=payments.findByIdForUpdate(paymentId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy payment"));
        String provider=p.getProvider();String providerStatus=p.getProviderResponseCode();String message="Local provider; no remote reconciliation";boolean changed=false;
        if(provider.startsWith("VNPAY")){
            var r=vnPay.query(p,ip);if(!r.signatureValid())throw new ApiException(HttpStatus.BAD_GATEWAY,"VNPAY query trả về chữ ký không hợp lệ");
            long expected=p.getAmount().movePointRight(2).longValueExact();if(r.amount()!=-1&&r.amount()!=expected)throw new ApiException(HttpStatus.CONFLICT,"VNPAY reconciliation amount mismatch");
            providerStatus=r.transactionStatus();message=r.message();p.setProviderResponseCode(r.responseCode()+"/"+r.transactionStatus());p.setProviderMessage(r.message());
            if("00".equals(r.responseCode())&&"00".equals(r.transactionStatus())){paymentService.success(p,r.transactionNo(),r.responseCode(),"Reconciled from VNPAY: "+r.message());changed=true;}
            else if(Set.of("04","05","06").contains(r.transactionStatus())&&p.getStatus()!=PaymentStatus.SUCCESS&&p.getStatus()!=PaymentStatus.REFUNDED){p.setStatus(PaymentStatus.REVIEW);payments.save(p);changed=true;}
            else if(!"01".equals(r.transactionStatus())&&p.getStatus()==PaymentStatus.PENDING){p.setStatus(PaymentStatus.FAILED);p.setFailedAt(Instant.now());payments.save(p);changed=true;}
            else payments.save(p);
        }else if(provider.startsWith("MOMO")){
            var r=momo.query(p);long expected=p.getAmount().longValueExact();if(r.amount()!=-1&&r.amount()!=expected)throw new ApiException(HttpStatus.CONFLICT,"MoMo reconciliation amount mismatch");
            providerStatus=r.resultCode();message=r.message();p.setProviderResponseCode(r.resultCode());p.setProviderMessage(r.message());int code=parse(r.resultCode());
            if(code==0){paymentService.success(p,r.transactionId(),r.resultCode(),"Reconciled from MoMo: "+r.message());changed=true;}
            else if(!Set.of(7000,7002,9000).contains(code)&&p.getStatus()==PaymentStatus.PENDING){p.setStatus(PaymentStatus.FAILED);p.setFailedAt(Instant.now());payments.save(p);changed=true;}
            else payments.save(p);
        }
        Payment current=payments.findById(paymentId).orElseThrow();audit.record(adminEmail,"PAYMENT_RECONCILE","PAYMENT",paymentId.toString(),provider+" providerStatus="+providerStatus+" localStatus="+current.getStatus(),ip);
        return new ReconciliationResult(paymentId,provider,current.getStatus().name(),providerStatus,current.getProviderTransactionId(),message,changed);
    }

    private long count(List<Payment> rows,PaymentStatus status){return rows.stream().filter(p->p.getStatus()==status).count();}
    private int parse(String s){try{return Integer.parseInt(s);}catch(Exception e){return -1;}}
    private PaymentAdminView view(Payment p){return new PaymentAdminView(p.getId(),p.getBookingId(),p.getPayerUserId(),p.getProvider(),p.getStatus().name(),p.getAmount(),p.getProviderOrderId(),p.getProviderTransactionId(),p.getProviderResponseCode(),p.getProviderMessage(),p.getCreatedAt(),p.getUpdatedAt(),p.getExpiresAt(),p.getPaidAt(),p.getFailedAt(),p.getLastWebhookAt());}
    private WebhookAdminView view(PaymentWebhookEvent e){return new WebhookAdminView(e.getId(),e.getProvider(),e.getEventKey(),e.getPaymentId(),e.getPayloadHash(),e.isSignatureValid(),e.getResultCode(),e.getResponseCode(),e.getResponseMessage(),e.getReceivedAt(),e.getProcessedAt());}
}
