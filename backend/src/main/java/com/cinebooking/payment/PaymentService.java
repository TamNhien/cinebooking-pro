package com.cinebooking.payment;

import com.cinebooking.booking.BookingService;
import com.cinebooking.commerce.LoyaltyTransactionRepository;
import com.cinebooking.commerce.InventoryService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.notification.NotificationService;
import com.cinebooking.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

import static com.cinebooking.payment.PaymentDtos.*;

@Service
public class PaymentService {
    private final PaymentRepository payments; private final BookingService bookingService; private final UserRepository users; private final VnPayGateway vnPay; private final MomoGateway momo; private final LoyaltyTransactionRepository loyaltyTransactions; private final NotificationService notifications; private final InventoryService inventory;
    public PaymentService(PaymentRepository payments,BookingService bookingService,UserRepository users,VnPayGateway vnPay,MomoGateway momo,LoyaltyTransactionRepository loyaltyTransactions,NotificationService notifications,InventoryService inventory){this.payments=payments;this.bookingService=bookingService;this.users=users;this.vnPay=vnPay;this.momo=momo;this.loyaltyTransactions=loyaltyTransactions;this.notifications=notifications;this.inventory=inventory;}

    @Transactional
    public PaymentStartResponse start(UUID bookingId,String email,String providerRaw,String ipAddress){
        Booking booking=bookingService.entity(bookingId);UUID userId=users.findByEmailIgnoreCase(email).orElseThrow().getId();
        if(!booking.getUserId().equals(userId))throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền thanh toán booking này");
        if(booking.getStatus()!=BookingStatus.PENDING)throw new ApiException(HttpStatus.CONFLICT,"Booking không ở trạng thái chờ thanh toán");
        if(booking.getExpiresAt()!=null&&booking.getExpiresAt().isBefore(Instant.now())){bookingService.cancelPending(bookingId,BookingStatus.EXPIRED);throw new ApiException(HttpStatus.CONFLICT,"Booking đã hết hạn; ghế đã được mở lại");}
        String provider=providerRaw.trim().toUpperCase(Locale.ROOT);Set<String> allowed=Set.of("MOCK","VNPAY","VNPAY_QR","MOMO","MOMO_QR");if(!allowed.contains(provider))throw new ApiException(HttpStatus.BAD_REQUEST,"provider không hợp lệ");
        String effectiveProvider=booking.getTotalAmount().signum()==0?"BALANCE":provider;
        Optional<Payment> latest=payments.findFirstByBookingIdOrderByCreatedAtDesc(bookingId);
        if(latest.isPresent()){
            Payment existing=latest.get();
            if(existing.getStatus()==PaymentStatus.PENDING&&effectiveProvider.equals(existing.getProvider())&&existing.getCheckoutUrl()!=null){
                String existingClientUrl=existing.getProvider().equals("MOMO_QR")?"/payment/qr?paymentId="+existing.getId():existing.getCheckoutUrl();
                return new PaymentStartResponse(existing.getId(),bookingId,existing.getProvider(),existingClientUrl,existing.getQrPayload(),existing.getDeeplink());
            }
        }
        Payment p=new Payment();p.setBookingId(bookingId);p.setProvider(effectiveProvider);p.setStatus(PaymentStatus.PENDING);p.setAmount(booking.getTotalAmount());payments.save(p);String externalRef=p.getId().toString().replace("-","");p.setProviderTransactionId(externalRef);
        if(booking.getTotalAmount().signum()==0){PaymentResultResponse r=success(p,"BALANCE-"+System.currentTimeMillis());return new PaymentStartResponse(p.getId(),bookingId,"BALANCE","/bookings",null,null);}
        String url=null,qr=null,deeplink=null;switch(provider){case "MOCK"->url="/payment/mock?bookingId="+bookingId+"&paymentId="+p.getId();case "VNPAY"->url=vnPay.createUrl(p,booking,ipAddress,false);case "VNPAY_QR"->url=vnPay.createUrl(p,booking,ipAddress,true);case "MOMO","MOMO_QR"->{var session=momo.create(p,booking);url=session.payUrl();qr=session.qrData();deeplink=session.deeplink();}default->throw new IllegalStateException();}
        p.setCheckoutUrl(url);p.setQrPayload(qr);p.setDeeplink(deeplink);payments.save(p);String clientUrl=provider.equals("MOMO_QR")?"/payment/qr?paymentId="+p.getId():url;return new PaymentStartResponse(p.getId(),bookingId,provider,clientUrl,qr,deeplink);
    }

    public PaymentCheckoutResponse checkout(UUID paymentId,String email){Payment p=payments.findById(paymentId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy payment"));Booking b=bookingService.entity(p.getBookingId());UUID userId=users.findByEmailIgnoreCase(email).orElseThrow().getId();if(!b.getUserId().equals(userId))throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền xem payment này");return new PaymentCheckoutResponse(p.getId(),p.getBookingId(),p.getProvider(),p.getStatus().name(),p.getCheckoutUrl(),p.getQrPayload(),p.getDeeplink());}
    @Transactional public PaymentResultResponse mockSuccess(UUID bookingId,String email){Booking booking=bookingService.entity(bookingId);UUID userId=users.findByEmailIgnoreCase(email).orElseThrow().getId();if(!booking.getUserId().equals(userId))throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền");Payment p=payments.findFirstByBookingIdOrderByCreatedAtDesc(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Chưa có payment"));if(!"MOCK".equals(p.getProvider()))throw new ApiException(HttpStatus.BAD_REQUEST,"Payment không phải MOCK");return success(p,"MOCK-"+System.currentTimeMillis());}
    @Transactional public PaymentResultResponse mockFail(UUID bookingId,String email){Booking booking=bookingService.entity(bookingId);UUID userId=users.findByEmailIgnoreCase(email).orElseThrow().getId();if(!booking.getUserId().equals(userId))throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền");Payment p=payments.findFirstByBookingIdOrderByCreatedAtDesc(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Chưa có payment"));p.setStatus(PaymentStatus.FAILED);payments.save(p);bookingService.cancelPending(bookingId,BookingStatus.CANCELLED);return result(p);}

    @Transactional public Map<String,String> vnPayIpn(Map<String,String> params){if(!vnPay.verify(params))return Map.of("RspCode","97","Message","Invalid checksum");String ref=params.getOrDefault("vnp_TxnRef","");Payment p=payments.findByProviderInAndProviderTransactionId(List.of("VNPAY","VNPAY_QR"),ref).orElse(null);if(p==null)return Map.of("RspCode","01","Message","Order not found");long expected=p.getAmount().movePointRight(2).longValueExact();long received;try{received=Long.parseLong(params.getOrDefault("vnp_Amount","-1"));}catch(Exception e){return Map.of("RspCode","04","Message","Invalid amount");}if(expected!=received)return Map.of("RspCode","04","Message","Invalid amount");if(p.getStatus()==PaymentStatus.SUCCESS)return Map.of("RspCode","02","Message","Order already confirmed");if("00".equals(params.get("vnp_ResponseCode"))&&"00".equals(params.get("vnp_TransactionStatus"))){success(p,params.getOrDefault("vnp_TransactionNo",ref));return Map.of("RspCode","00","Message","Confirm Success");}p.setStatus(PaymentStatus.FAILED);payments.save(p);bookingService.cancelPending(p.getBookingId(),BookingStatus.CANCELLED);return Map.of("RspCode","00","Message","Payment failed recorded");}
    @Transactional public Map<String,Object> momoIpn(Map<String,Object> params){if(!momo.verifyIpn(params))return Map.of("resultCode",97,"message","Invalid signature");String orderId=String.valueOf(params.getOrDefault("orderId",""));Payment p=payments.findByProviderInAndProviderTransactionId(List.of("MOMO","MOMO_QR"),orderId).orElse(null);if(p==null)return Map.of("resultCode",1,"message","Order not found");long received;try{received=Long.parseLong(String.valueOf(params.getOrDefault("amount","-1")));}catch(Exception e){return Map.of("resultCode",1,"message","Invalid amount");}if(p.getAmount().longValueExact()!=received)return Map.of("resultCode",1,"message","Invalid amount");int code=Integer.parseInt(String.valueOf(params.getOrDefault("resultCode","-1")));if(code==0)success(p,String.valueOf(params.getOrDefault("transId",orderId)));else{p.setStatus(PaymentStatus.FAILED);payments.save(p);bookingService.cancelPending(p.getBookingId(),BookingStatus.CANCELLED);}return Map.of("resultCode",0,"message","success");}

    @Transactional
    public PaymentResultResponse success(Payment input,String providerTxn){
        Payment p=payments.findByIdForUpdate(input.getId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy payment"));
        if(p.getStatus()==PaymentStatus.SUCCESS){awardLoyaltyIfNeeded(p);return result(p);}
        if(p.getStatus()==PaymentStatus.REFUNDED)return result(p);
        // V19: convert the PENDING inventory reservation into a real stock issue exactly once.
        inventory.finalizeSale(p.getBookingId());
        Booking b=bookingService.confirm(p.getBookingId());p.setStatus(PaymentStatus.SUCCESS);p.setPaidAt(Instant.now());awardLoyaltyIfNeeded(p);payments.save(p);
        notifications.create(b.getUserId(),"PAYMENT_SUCCESS","Thanh toán thành công","Vé "+b.getId()+" đã được xác nhận. Bạn có thể mở QR vé trong mục Vé của tôi.","/ticket/"+b.getId());
        return new PaymentResultResponse(p.getId(),p.getBookingId(),p.getProvider(),p.getStatus().name(),b.getStatus().name());
    }

    private void awardLoyaltyIfNeeded(Payment p){
        if(p.getLoyaltyPointsAwarded()!=null&&p.getLoyaltyPointsAwarded()>0)return;Booking booking=bookingService.entity(p.getBookingId());AppUser user=users.findByIdForUpdate(booking.getUserId()).orElseThrow();int points=p.getAmount().divideToIntegralValue(java.math.BigDecimal.valueOf(10000)).intValue();if(points<=0){p.setLoyaltyPointsAwarded(0);return;}int total=(user.getLoyaltyPoints()==null?0:user.getLoyaltyPoints())+points;user.setLoyaltyPoints(total);user.setMembershipTier(tier(total));users.save(user);p.setLoyaltyPointsAwarded(points);LoyaltyTransaction tx=new LoyaltyTransaction();tx.setUserId(user.getId());tx.setBookingId(booking.getId());tx.setTransactionType("EARN");tx.setPoints(points);tx.setDescription("Tích điểm từ thanh toán booking "+booking.getId());loyaltyTransactions.save(tx);
    }
    private String tier(int points){if(points>=4000)return "DIAMOND";if(points>=1500)return "GOLD";if(points>=500)return "SILVER";return "BRONZE";}
    private PaymentResultResponse result(Payment p){Booking b=bookingService.entity(p.getBookingId());return new PaymentResultResponse(p.getId(),p.getBookingId(),p.getProvider(),p.getStatus().name(),b.getStatus().name());}
}
