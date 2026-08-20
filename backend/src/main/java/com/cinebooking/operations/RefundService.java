package com.cinebooking.operations;

import com.cinebooking.audit.AuditService;
import com.cinebooking.booking.BookingRepository;
import com.cinebooking.booking.BookingSeatRepository;
import com.cinebooking.commerce.CommerceService;
import com.cinebooking.commerce.InventoryService;
import com.cinebooking.commerce.LoyaltyTransactionRepository;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.ShowtimeRepository;
import com.cinebooking.notification.NotificationService;
import com.cinebooking.payment.PaymentRepository;
import com.cinebooking.user.UserRepository;
import com.cinebooking.waitlist.ShowtimeWaitlistService;
import com.cinebooking.websocket.SeatEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Service
public class RefundService {
    private final BookingRepository bookings;
    private final ShowtimeRepository showtimes;
    private final UserRepository users;
    private final PaymentRepository payments;
    private final CommerceService commerce;
    private final InventoryService inventory;
    private final LoyaltyTransactionRepository loyalty;
    private final NotificationService notifications;
    private final AuditService audit;
    private final BookingSeatRepository bookingSeats;
    private final SeatEventPublisher events;
    private final ShowtimeWaitlistService waitlist;
    private final RefundPolicy policy;

    public RefundService(BookingRepository bookings, ShowtimeRepository showtimes, UserRepository users,
                         PaymentRepository payments, CommerceService commerce, InventoryService inventory,
                         LoyaltyTransactionRepository loyalty, NotificationService notifications, AuditService audit,
                         BookingSeatRepository bookingSeats, SeatEventPublisher events, ShowtimeWaitlistService waitlist,
                         RefundPolicy policy) {
        this.bookings=bookings; this.showtimes=showtimes; this.users=users; this.payments=payments; this.commerce=commerce;
        this.inventory=inventory; this.loyalty=loyalty; this.notifications=notifications; this.audit=audit;
        this.bookingSeats=bookingSeats; this.events=events; this.waitlist=waitlist; this.policy=policy;
    }

    public RefundQuote quote(UUID bookingId, String email) {
        AppUser user = users.findByEmailIgnoreCase(email).orElseThrow();
        Booking b = bookings.findById(bookingId).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));
        requireTicketOwner(b,user);
        return quoteView(b, latestPayment(b));
    }

    @Transactional
    public RefundView request(UUID bookingId,String email,String reason,String ip){
        AppUser user=users.findByEmailIgnoreCase(email).orElseThrow();
        Booking b=bookings.findByIdForUpdate(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));
        requireTicketOwner(b,user);
        if(b.getStatus()==BookingStatus.REFUNDED || b.getStatus()==BookingStatus.REFUND_REQUESTED) return view(b);
        return prepareRequest(b, email, reason, ip, false);
    }

    @Transactional
    public RefundView adminRequest(UUID bookingId,String adminEmail,String reason,String ip){
        Booking b=bookings.findByIdForUpdate(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));
        if(b.getStatus()==BookingStatus.REFUNDED || b.getStatus()==BookingStatus.REFUND_REQUESTED) return view(b);
        return prepareRequest(b, adminEmail, reason, ip, true);
    }

    private RefundView prepareRequest(Booking b,String actorEmail,String reason,String ip,boolean admin){
        validateRefundableBooking(b);
        Payment payment=latestPayment(b);
        RefundQuote q=quoteView(b,payment);
        if(!q.refundable()) throw new ApiException(HttpStatus.CONFLICT,q.message());

        Instant now=Instant.now();
        b.setStatus(BookingStatus.REFUND_REQUESTED);
        b.setRefundRequestedAt(now);
        b.setRefundAmount(q.refundAmount());
        b.setRefundRatePercent(q.ratePercent());
        b.setRefundFeeAmount(q.feeAmount());
        b.setRefundPolicyCode(q.policyCode());
        b.setRefundAutomatic(q.automatic());
        String defaultReason=admin?"Admin tạo yêu cầu hoàn vé":"Khách hàng yêu cầu hoàn vé";
        b.setRefundReason(reason==null||reason.isBlank()?defaultReason:reason.trim());
        bookings.save(b);

        audit.record(actorEmail,admin?"REFUND_REQUEST_ADMIN":"REFUND_REQUEST","BOOKING",b.getId().toString(),
                "policy="+q.policyCode()+", amount="+q.refundAmount()+", fee="+q.feeAmount()+", auto="+q.automatic(),ip);

        if(q.automatic()) {
            return finalizeRefund(b,payment,"SYSTEM","AUTO-"+b.getId(),ip,true);
        }
        notifications.create(b.getUserId(),"REFUND_REQUESTED","Đã tiếp nhận yêu cầu hoàn vé",
                "Yêu cầu hoàn "+q.refundAmount().toPlainString()+"đ đang chờ quản trị viên xác nhận.","/bookings");
        return view(b);
    }

    @Transactional
    public RefundView approve(UUID bookingId,String adminEmail,String providerReference,String ip){
        Booking b=bookings.findByIdForUpdate(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));
        if(b.getStatus()==BookingStatus.REFUNDED) return view(b);
        if(b.getStatus()!=BookingStatus.REFUND_REQUESTED)throw new ApiException(HttpStatus.CONFLICT,"Booking không nằm trong hàng đợi hoàn tiền");
        Payment p=latestPayment(b);
        if(!"MOCK".equals(p.getProvider()) && (providerReference==null || providerReference.isBlank())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,"Cần nhập mã/reference hoàn tiền từ cổng thanh toán trước khi xác nhận");
        }
        String reference="MOCK".equals(p.getProvider())?"ADMIN-MOCK-"+b.getId():providerReference.trim();
        return finalizeRefund(b,p,adminEmail,reference,ip,false);
    }

    private RefundView finalizeRefund(Booking b, Payment p, String actorEmail, String providerReference, String ip, boolean automatic){
        if(Boolean.TRUE.equals(b.getBenefitsRefunded()) && b.getStatus()==BookingStatus.REFUNDED) return view(b);
        UUID benefitOwnerId=b.getPurchaserUserId()==null?b.getUserId():b.getPurchaserUserId();
        AppUser user=users.findByIdForUpdate(benefitOwnerId).orElseThrow();

        int earned=p.getLoyaltyPointsAwarded()==null?0:p.getLoyaltyPointsAwarded();
        if(earned>0){
            int current=user.getLoyaltyPoints()==null?0:user.getLoyaltyPoints();
            user.setLoyaltyPoints(Math.max(0,current-earned)); user.setMembershipTier(tier(user.getLoyaltyPoints()));
            LoyaltyTransaction tx=new LoyaltyTransaction(); tx.setUserId(user.getId()); tx.setBookingId(b.getId()); tx.setTransactionType("REVERSAL"); tx.setPoints(earned); tx.setDescription("Thu hồi điểm do hoàn tiền booking "+b.getId()); loyalty.save(tx);
        }
        int redeemed=b.getPointsRedeemed()==null?0:b.getPointsRedeemed();
        if(redeemed>0){
            user.setLoyaltyPoints((user.getLoyaltyPoints()==null?0:user.getLoyaltyPoints())+redeemed); user.setMembershipTier(tier(user.getLoyaltyPoints()));
            LoyaltyTransaction tx=new LoyaltyTransaction(); tx.setUserId(user.getId()); tx.setBookingId(b.getId()); tx.setTransactionType("REFUND"); tx.setPoints(redeemed); tx.setDescription("Hoàn điểm đã dùng do hoàn vé"); loyalty.save(tx);
        }
        users.save(user);
        commerce.releaseVoucher(b.getId());
        inventory.restoreForRefund(b.getId());

        Instant now=Instant.now();
        b.setBenefitsRefunded(true); b.setStatus(BookingStatus.REFUNDED); b.setRefundedAt(now); b.setRefundProcessedAt(now);
        b.setRefundProcessedBy(actorEmail); b.setRefundProviderReference(providerReference); b.setRefundAutomatic(automatic || Boolean.TRUE.equals(b.getRefundAutomatic()));
        bookings.save(b);

        p.setStatus(PaymentStatus.REFUNDED); p.setRefundedAmount(b.getRefundAmount()); p.setRefundedAt(now); p.setRefundReference(providerReference);
        p.setProviderMessage("Refund recorded: "+b.getRefundAmount()+" / "+p.getAmount()+"; policy="+b.getRefundPolicyCode());
        payments.save(p);

        List<UUID> seatIds=bookingSeats.findByBookingId(b.getId()).stream().map(BookingSeat::getSeatId).toList();
        bookingSeats.releaseByBookingId(b.getId());
        notifications.create(b.getUserId(),"REFUND_APPROVED",automatic?"Hoàn vé tự động thành công":"Hoàn vé đã được duyệt",
                "Booking "+b.getId()+" đã ghi nhận hoàn "+b.getRefundAmount().toPlainString()+"đ. Phí hủy: "+nz(b.getRefundFeeAmount()).toPlainString()+"đ. Ghế đã được mở bán lại.","/bookings");
        audit.record(actorEmail,automatic?"REFUND_AUTO_APPROVE":"REFUND_APPROVE","BOOKING",b.getId().toString(),
                "amount="+b.getRefundAmount()+", fee="+nz(b.getRefundFeeAmount())+", reference="+providerReference,ip);
        events.publish(b.getShowtimeId(),"REFUNDED",seatIds);
        scanWaitlistAfterCommit(b.getShowtimeId());
        return view(b);
    }

    @Transactional
    public RefundView reject(UUID bookingId,String adminEmail,String ip){
        Booking b=bookings.findByIdForUpdate(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));
        if(b.getStatus()!=BookingStatus.REFUND_REQUESTED)throw new ApiException(HttpStatus.CONFLICT,"Booking không nằm trong hàng đợi hoàn tiền");
        String old=b.getRefundReason(); b.setStatus(BookingStatus.CONFIRMED); clearRequestSnapshot(b); bookings.save(b);
        notifications.create(b.getUserId(),"REFUND_REJECTED","Yêu cầu hoàn vé chưa được duyệt","Yêu cầu hoàn vé cho booking "+b.getId()+" đã bị từ chối. Vé vẫn còn hiệu lực.","/bookings");
        audit.record(adminEmail,"REFUND_REJECT","BOOKING",b.getId().toString(),old,ip); return view(b);
    }

    public List<RefundView> queue(){return bookings.findByStatusOrderByRefundRequestedAtAsc(BookingStatus.REFUND_REQUESTED).stream().map(this::view).toList();}

    private RefundQuote quoteView(Booking b, Payment payment){
        validateRefundableBooking(b);
        Showtime st=showtimes.findById(b.getShowtimeId()).orElseThrow();
        RefundPolicy.Quote q=policy.quote(b.getTotalAmount(),st.getStartTime(),Instant.now());
        boolean mock="MOCK".equals(payment.getProvider());
        boolean automatic=q.refundable() && q.autoPolicyEligible() && mock;
        boolean gatewayConfirmation=q.refundable() && !mock;
        String message=q.message();
        if(q.refundable() && q.autoPolicyEligible() && !mock) message += " Cổng "+payment.getProvider()+" cần reference hoàn tiền nên yêu cầu sẽ chờ admin xác nhận.";
        return new RefundQuote(b.getId(),q.refundable(),q.policyCode(),q.ratePercent(),q.refundAmount(),q.feeAmount(),automatic,
                q.refundable()&&!automatic,gatewayConfirmation,q.minutesBeforeShowtime(),st.getStartTime(),payment.getProvider(),message);
    }

    private void scanWaitlistAfterCommit(UUID showtimeId){
        Runnable scan=()->{try{waitlist.scanShowtime(showtimeId);}catch(Exception ignored){}};
        if(TransactionSynchronizationManager.isSynchronizationActive()){
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){
                @Override public void afterCommit(){scan.run();}
            });
        }else scan.run();
    }

    private Payment latestPayment(Booking b){
        Payment p=payments.findFirstByBookingIdOrderByCreatedAtDesc(b.getId()).orElseThrow(()->new ApiException(HttpStatus.CONFLICT,"Không tìm thấy giao dịch thanh toán"));
        if(p.getStatus()!=PaymentStatus.SUCCESS && p.getStatus()!=PaymentStatus.REFUNDED) throw new ApiException(HttpStatus.CONFLICT,"Giao dịch thanh toán chưa ở trạng thái có thể hoàn tiền");
        return p;
    }
    private void requireTicketOwner(Booking b, AppUser user){if(!b.getUserId().equals(user.getId()))throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền yêu cầu hoàn vé này");}
    private void validateRefundableBooking(Booking b){
        if(b.getStatus()==BookingStatus.REFUNDED)return;
        if(b.getStatus()!=BookingStatus.CONFIRMED && b.getStatus()!=BookingStatus.REFUND_REQUESTED)throw new ApiException(HttpStatus.CONFLICT,"Chỉ booking đã thanh toán mới có thể yêu cầu hoàn tiền");
        if(b.getCheckedInAt()!=null)throw new ApiException(HttpStatus.CONFLICT,"Vé đã check-in nên không thể hoàn tiền");
    }
    private void clearRequestSnapshot(Booking b){b.setRefundRequestedAt(null);b.setRefundAmount(null);b.setRefundReason(null);b.setRefundRatePercent(null);b.setRefundFeeAmount(null);b.setRefundPolicyCode(null);b.setRefundAutomatic(false);}
    private RefundView view(Booking b){return new RefundView(b.getId(),b.getUserId(),b.getShowtimeId(),b.getStatus().name(),b.getTotalAmount(),b.getRefundAmount(),b.getRefundFeeAmount(),b.getRefundRatePercent(),b.getRefundPolicyCode(),Boolean.TRUE.equals(b.getRefundAutomatic()),b.getRefundReason(),b.getRefundRequestedAt(),b.getRefundedAt(),b.getRefundProcessedAt(),b.getRefundProcessedBy(),b.getRefundProviderReference());}
    private BigDecimal nz(BigDecimal v){return v==null?BigDecimal.ZERO:v;}
    private String tier(int p){if(p>=4000)return "DIAMOND";if(p>=1500)return "GOLD";if(p>=500)return "SILVER";return "BRONZE";}

    public record RefundQuote(UUID bookingId,boolean refundable,String policyCode,BigDecimal ratePercent,BigDecimal refundAmount,
                              BigDecimal feeAmount,boolean automatic,boolean requiresAdmin,boolean gatewayConfirmationRequired,
                              long minutesBeforeShowtime,Instant showtimeStart,String paymentProvider,String message){}
    public record RefundView(UUID bookingId,UUID userId,UUID showtimeId,String status,BigDecimal totalAmount,BigDecimal refundAmount,
                             BigDecimal feeAmount,BigDecimal ratePercent,String policyCode,boolean automatic,String reason,
                             Instant requestedAt,Instant refundedAt,Instant processedAt,String processedBy,String providerReference){}
}
