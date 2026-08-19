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
    public record StartClaim(Payment payment, Booking booking, boolean replayed) {}
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
                return new StartClaim(p,booking,true);
            }
        }

        if(booking.getStatus()!=BookingStatus.PENDING)throw new ApiException(HttpStatus.CONFLICT,"Booking không ở trạng thái chờ thanh toán");
        if(booking.getExpiresAt()!=null&&booking.getExpiresAt().isBefore(Instant.now()))throw new ApiException(HttpStatus.CONFLICT,"Booking đã hết hạn; vui lòng tải lại sơ đồ ghế");

        Optional<Payment> latest=payments.findFirstByBookingIdOrderByCreatedAtDesc(bookingId);
        if(idempotencyKey==null&&latest.isPresent()){
            Payment p=latest.get();
            if(p.getStatus()==PaymentStatus.PENDING&&provider.equals(p.getProvider()))return new StartClaim(p,booking,true);
        }

        Payment p=new Payment();
        UUID paymentId=UUID.randomUUID();
        p.setId(paymentId);p.setBookingId(bookingId);p.setPayerUserId(userId);p.setProvider(provider);p.setStatus(PaymentStatus.PENDING);p.setAmount(booking.getTotalAmount());
        p.setClientIdempotencyKey(idempotencyKey);p.setExpiresAt(booking.getExpiresAt());
        p.setProviderOrderId(paymentId.toString().replace("-",""));p.setMerchantRequestId(paymentId.toString());
        if(provider.startsWith("VNPAY"))p.setProviderCreatedAt(LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")));
        payments.save(p);
        return new StartClaim(p,booking,false);
    }

    @Transactional
    public Payment attachSession(UUID paymentId,String checkoutUrl,String qrPayload,String deeplink,String responseCode,String message){
        Payment p=payments.findByIdForUpdate(paymentId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy payment"));
        if(p.getStatus()!=PaymentStatus.PENDING)return p;
        p.setCheckoutUrl(checkoutUrl);p.setQrPayload(qrPayload);p.setDeeplink(deeplink);p.setProviderResponseCode(responseCode);p.setProviderMessage(message);
        return payments.save(p);
    }

    @Transactional
    public void recordGatewayError(UUID paymentId,String code,String message){
        payments.findByIdForUpdate(paymentId).ifPresent(p->{if(p.getStatus()==PaymentStatus.PENDING){p.setProviderResponseCode(code);p.setProviderMessage(message);payments.save(p);}});
    }
}
