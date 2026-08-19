package com.cinebooking.operations;

import com.cinebooking.audit.AuditService;
import com.cinebooking.booking.*;
import com.cinebooking.commerce.*;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.ShowtimeRepository;
import com.cinebooking.notification.NotificationService;
import com.cinebooking.payment.PaymentRepository;
import com.cinebooking.user.UserRepository;
import com.cinebooking.websocket.SeatEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.*;
import java.time.*;
import java.util.*;

@Service
public class RefundService {
    private final BookingRepository bookings; private final ShowtimeRepository showtimes; private final UserRepository users; private final PaymentRepository payments; private final CommerceService commerce; private final InventoryService inventory; private final LoyaltyTransactionRepository loyalty; private final NotificationService notifications; private final AuditService audit; private final BookingSeatRepository bookingSeats; private final SeatEventPublisher events;
    public RefundService(BookingRepository bookings,ShowtimeRepository showtimes,UserRepository users,PaymentRepository payments,CommerceService commerce,InventoryService inventory,LoyaltyTransactionRepository loyalty,NotificationService notifications,AuditService audit,BookingSeatRepository bookingSeats,SeatEventPublisher events){this.bookings=bookings;this.showtimes=showtimes;this.users=users;this.payments=payments;this.commerce=commerce;this.inventory=inventory;this.loyalty=loyalty;this.notifications=notifications;this.audit=audit;this.bookingSeats=bookingSeats;this.events=events;}

    @Transactional public RefundView request(UUID bookingId,String email,String reason,String ip){
        AppUser user=users.findByEmailIgnoreCase(email).orElseThrow(); Booking b=bookings.findByIdForUpdate(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));
        if(!b.getUserId().equals(user.getId()))throw new ApiException(HttpStatus.FORBIDDEN,"Không có quyền yêu cầu hoàn vé này");
        return prepareRequest(b, email, reason, ip, false);
    }

    @Transactional public RefundView adminRequest(UUID bookingId,String adminEmail,String reason,String ip){
        Booking b=bookings.findByIdForUpdate(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));
        return prepareRequest(b, adminEmail, reason, ip, true);
    }

    private RefundView prepareRequest(Booking b,String actorEmail,String reason,String ip,boolean admin){
        if(b.getStatus()!=BookingStatus.CONFIRMED)throw new ApiException(HttpStatus.CONFLICT,"Chỉ booking đã thanh toán mới có thể yêu cầu hoàn tiền");
        if(b.getCheckedInAt()!=null)throw new ApiException(HttpStatus.CONFLICT,"Vé đã check-in nên không thể hoàn tiền");
        Showtime st=showtimes.findById(b.getShowtimeId()).orElseThrow(); long minutes=Duration.between(Instant.now(),st.getStartTime()).toMinutes(); if(minutes<120)throw new ApiException(HttpStatus.CONFLICT,"Chỉ có thể yêu cầu hoàn vé trước giờ chiếu ít nhất 2 giờ");
        BigDecimal rate=minutes>=24*60?BigDecimal.ONE:new BigDecimal("0.70"); BigDecimal amount=b.getTotalAmount().multiply(rate).setScale(0,RoundingMode.DOWN);
        b.setStatus(BookingStatus.REFUND_REQUESTED);b.setRefundRequestedAt(Instant.now());b.setRefundAmount(amount);
        String defaultReason=admin?"Admin tạo yêu cầu hoàn vé":"Khách hàng yêu cầu hoàn vé";
        b.setRefundReason(reason==null||reason.isBlank()?defaultReason:reason.trim());bookings.save(b);
        notifications.create(b.getUserId(),"REFUND_REQUESTED","Đã tiếp nhận yêu cầu hoàn vé","Yêu cầu hoàn "+amount.toPlainString()+"đ đang chờ quản trị viên xử lý.","/bookings");
        audit.record(actorEmail,admin?"REFUND_REQUEST_ADMIN":"REFUND_REQUEST","BOOKING",b.getId().toString(),"amount="+amount.toPlainString(),ip); return view(b);
    }

    @Transactional public RefundView approve(UUID bookingId,String adminEmail,String ip){
        Booking b=bookings.findByIdForUpdate(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking")); if(b.getStatus()!=BookingStatus.REFUND_REQUESTED)throw new ApiException(HttpStatus.CONFLICT,"Booking không nằm trong hàng đợi hoàn tiền");
        UUID benefitOwnerId=b.getPurchaserUserId()==null?b.getUserId():b.getPurchaserUserId();
        AppUser user=users.findByIdForUpdate(benefitOwnerId).orElseThrow(); Payment p=payments.findFirstByBookingIdOrderByCreatedAtDesc(b.getId()).orElseThrow(()->new ApiException(HttpStatus.CONFLICT,"Không tìm thấy giao dịch thanh toán"));
        int earned=p.getLoyaltyPointsAwarded()==null?0:p.getLoyaltyPointsAwarded(); if(earned>0){int current=user.getLoyaltyPoints()==null?0:user.getLoyaltyPoints();user.setLoyaltyPoints(Math.max(0,current-earned));user.setMembershipTier(tier(user.getLoyaltyPoints()));LoyaltyTransaction tx=new LoyaltyTransaction();tx.setUserId(user.getId());tx.setBookingId(b.getId());tx.setTransactionType("REVERSAL");tx.setPoints(earned);tx.setDescription("Thu hồi điểm do hoàn tiền booking "+b.getId());loyalty.save(tx);}
        int redeemed=b.getPointsRedeemed()==null?0:b.getPointsRedeemed(); if(redeemed>0){user.setLoyaltyPoints((user.getLoyaltyPoints()==null?0:user.getLoyaltyPoints())+redeemed);user.setMembershipTier(tier(user.getLoyaltyPoints()));LoyaltyTransaction tx=new LoyaltyTransaction();tx.setUserId(user.getId());tx.setBookingId(b.getId());tx.setTransactionType("REFUND");tx.setPoints(redeemed);tx.setDescription("Hoàn điểm đã dùng do hoàn vé");loyalty.save(tx);} users.save(user);
        commerce.releaseVoucher(b.getId()); inventory.restoreForRefund(b.getId()); b.setBenefitsRefunded(true); b.setStatus(BookingStatus.REFUNDED); b.setRefundedAt(Instant.now()); bookings.save(b); p.setStatus(PaymentStatus.REFUNDED);payments.save(p);
        List<UUID> seatIds=bookingSeats.findByBookingId(b.getId()).stream().map(BookingSeat::getSeatId).toList();
        bookingSeats.releaseByBookingId(b.getId());
        notifications.create(b.getUserId(),"REFUND_APPROVED","Hoàn vé đã được duyệt","Booking "+b.getId()+" đã được hoàn "+b.getRefundAmount().toPlainString()+"đ. Ghế đã được mở bán lại.","/bookings"); audit.record(adminEmail,"REFUND_APPROVE","BOOKING",b.getId().toString(),"amount="+b.getRefundAmount(),ip); events.publish(b.getShowtimeId(),"REFUNDED",seatIds); return view(b);
    }
    @Transactional public RefundView reject(UUID bookingId,String adminEmail,String ip){Booking b=bookings.findByIdForUpdate(bookingId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy booking"));if(b.getStatus()!=BookingStatus.REFUND_REQUESTED)throw new ApiException(HttpStatus.CONFLICT,"Booking không nằm trong hàng đợi hoàn tiền");String old=b.getRefundReason();b.setStatus(BookingStatus.CONFIRMED);b.setRefundRequestedAt(null);b.setRefundAmount(null);b.setRefundReason(null);bookings.save(b);notifications.create(b.getUserId(),"REFUND_REJECTED","Yêu cầu hoàn vé chưa được duyệt","Yêu cầu hoàn vé cho booking "+b.getId()+" đã bị từ chối. Vé vẫn còn hiệu lực.","/bookings");audit.record(adminEmail,"REFUND_REJECT","BOOKING",b.getId().toString(),old,ip);return view(b);}
    public List<RefundView> queue(){return bookings.findByStatusOrderByRefundRequestedAtAsc(BookingStatus.REFUND_REQUESTED).stream().map(this::view).toList();}
    private RefundView view(Booking b){return new RefundView(b.getId(),b.getUserId(),b.getShowtimeId(),b.getStatus().name(),b.getTotalAmount(),b.getRefundAmount(),b.getRefundReason(),b.getRefundRequestedAt(),b.getRefundedAt());}
    private String tier(int p){if(p>=4000)return "DIAMOND";if(p>=1500)return "GOLD";if(p>=500)return "SILVER";return "BRONZE";}
    public record RefundView(UUID bookingId,UUID userId,UUID showtimeId,String status,BigDecimal totalAmount,BigDecimal refundAmount,String reason,Instant requestedAt,Instant refundedAt){}
}
