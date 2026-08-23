package com.cinebooking.payment;

import com.cinebooking.booking.BookingRepository;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class PaymentAttemptService {
    public record StartClaim(Payment payment, Booking booking, boolean replayed, boolean retry) {}
    private final PaymentRepository payments; private final BookingRepository bookings; private final UserRepository users;
    public PaymentAttemptService(PaymentRepository payments,BookingRepository bookings,UserRepository users){this.payments=payments;this.bookings=bookings;this.users=users;}

    @Transactional
    public StartClaim claim(UUID bookingId,String email,String provider,String idempotencyKey){
        Booking booking=bookings.findByIdForUpdate(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));
        UUID userId=users.findByEmailIgnoreCase(email).orElseThrow().getId();
        if(!booking.getUserId().equals(userId))throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền thanh toán booking này");

        if(idempotencyKey!=null){
            Optional<Payment> replay=payments.findByBookingIdAndClientIdempotencyKey(bookingId,idempotencyKey);
            if(replay.isPresent()){
                Payment p=replay.get();
                if(!provider.equals(p.getProvider()))throw new ApiException(HttpStatus.CONFLICT,"Idempotency-Key đã được dùng với cổng thanh toán khác");
                return new StartClaim(p,booking,true,p.getRetryOfPaymentId()!=null);
            }
        }

        assertBookingPayable(booking);
        Optional<Payment> latest=payments.findFirstByBookingIdOrderByCreatedAtDesc(bookingId);
        if(idempotencyKey==null&&latest.isPresent()){
            Payment p=latest.get();
            if(p.getStatus()==PaymentStatus.PENDING&&provider.equals(p.getProvider()))return new StartClaim(p,booking,true,p.getRetryOfPaymentId()!=null);
        }

        UUID retryOf=latest.filter(x->x.getStatus()==PaymentStatus.FAILED||x.getStatus()==PaymentStatus.CANCELLED).map(Payment::getId).orElse(null);
        Payment p=newPayment(booking,userId,provider,idempotencyKey,retryOf,nextAttempt(bookingId));
        payments.save(p);
        return new StartClaim(p,booking,false,retryOf!=null);
    }

    @Transactional
    public StartClaim retry(UUID sourcePaymentId,String email,String provider,String idempotencyKey){
        Payment source=payments.findByIdForUpdate(sourcePaymentId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy payment"));
        Booking booking=bookings.findByIdForUpdate(source.getBookingId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));
        UUID userId=users.findByEmailIgnoreCase(email).orElseThrow().getId();
        if(!source.getPayerUserId().equals(userId)||!booking.getUserId().equals(userId))throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền thử lại giao dịch này");
        assertBookingPayable(booking);
        if(!PaymentRetryRules.canRetry(source.getStatus(),booking.getExpiresAt(),Instant.now()))throw new ApiException(HttpStatus.CONFLICT,"Chỉ payment FAILED/CANCELLED còn trong thời hạn booking mới được thử lại");

        if(idempotencyKey!=null){
            Optional<Payment> replay=payments.findByBookingIdAndClientIdempotencyKey(booking.getId(),idempotencyKey);
            if(replay.isPresent()){
                Payment p=replay.get();
                if(!provider.equals(p.getProvider()))throw new ApiException(HttpStatus.CONFLICT,"Idempotency-Key đã được dùng với cổng thanh toán khác");
                return new StartClaim(p,booking,true,true);
            }
        }

        Optional<Payment> latest=payments.findFirstByBookingIdOrderByCreatedAtDesc(booking.getId());
        if(latest.isPresent()&&!latest.get().getId().equals(source.getId())){
            PaymentStatus status=latest.get().getStatus();
            if(status==PaymentStatus.PENDING||status==PaymentStatus.REVIEW||status==PaymentStatus.SUCCESS||status==PaymentStatus.REFUNDED)
                throw new ApiException(HttpStatus.CONFLICT,"Booking đã có lần thanh toán mới hơn ở trạng thái "+status);
        }

        Payment p=newPayment(booking,userId,provider,idempotencyKey,source.getId(),nextAttempt(booking.getId()));
        payments.save(p);
        return new StartClaim(p,booking,false,true);
    }

    @Transactional
    public Payment attachSession(UUID paymentId,String checkoutUrl,String qrPayload,String deeplink,String responseCode,String message,Instant nextReconcileAt){
        Payment p=payments.findByIdForUpdate(paymentId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy payment"));
        if(p.getStatus()!=PaymentStatus.PENDING)return p;
        p.setCheckoutUrl(checkoutUrl);p.setQrPayload(qrPayload);p.setDeeplink(deeplink);p.setProviderResponseCode(responseCode);p.setProviderMessage(message);p.setNextReconcileAt(nextReconcileAt);
        return payments.save(p);
    }

    @Transactional
    public void recordGatewayError(UUID paymentId,String code,String message){
        payments.findByIdForUpdate(paymentId).ifPresent(p->{if(p.getStatus()==PaymentStatus.PENDING){p.setProviderResponseCode(code);p.setProviderMessage(message);p.setReconciliationFailures((p.getReconciliationFailures()==null?0:p.getReconciliationFailures())+1);payments.save(p);}});
    }

    private Payment newPayment(Booking booking,UUID userId,String provider,String idempotencyKey,UUID retryOf,int attemptNo){
        Payment p=new Payment();UUID paymentId=UUID.randomUUID();
        p.setId(paymentId);p.setBookingId(booking.getId());p.setPayerUserId(userId);p.setProvider(provider);p.setStatus(PaymentStatus.PENDING);p.setAmount(booking.getTotalAmount());
        p.setClientIdempotencyKey(idempotencyKey);p.setExpiresAt(booking.getExpiresAt());p.setAttemptNo(attemptNo);p.setRetryOfPaymentId(retryOf);p.setReconciliationFailures(0);
        p.setProviderOrderId(paymentId.toString().replace("-",""));p.setMerchantRequestId(paymentId.toString());
        if(provider.startsWith("VNPAY"))p.setProviderCreatedAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
        return p;
    }
    private int nextAttempt(UUID bookingId){Integer max=payments.maxAttemptNo(bookingId);return (max==null?0:max)+1;}
    private void assertBookingPayable(Booking booking){
        if(booking.getStatus()!=BookingStatus.PENDING)throw new ApiException(HttpStatus.CONFLICT,"Booking không ở trạng thái chờ thanh toán");
        if(booking.getExpiresAt()!=null&&booking.getExpiresAt().isBefore(Instant.now()))throw new ApiException(HttpStatus.CONFLICT,"Booking đã hết hạn; vui lòng tải lại sơ đồ ghế");
    }
}
