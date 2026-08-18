package com.cinebooking.notification;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.*;
import static com.cinebooking.notification.NotificationDtos.*;

@Service
public class NotificationService {
    private final NotificationRepository repo;
    private final NotificationPreferenceRepository preferences;
    private final UserRepository users;
    private final NotificationDeliveryService delivery;

    public NotificationService(NotificationRepository r,NotificationPreferenceRepository p,UserRepository u,NotificationDeliveryService d){repo=r;preferences=p;users=u;delivery=d;}

    @Transactional
    public void create(UUID userId,String type,String title,String message,String link){
        createInternal(userId,type,title,message,link,null);
    }

    @Transactional
    public boolean createOnce(UUID userId,String type,String title,String message,String link,String dedupeKey){
        if(dedupeKey==null||dedupeKey.isBlank())throw new IllegalArgumentException("dedupeKey is required");
        NotificationPreference pref=preference(userId); String category=category(type);
        if(!enabled(pref,category) || noChannel(pref))return false;
        UUID id=UUID.randomUUID(); String emailStatus=Boolean.TRUE.equals(pref.getEmailEnabled())?"PENDING":"SKIPPED";
        int inserted=repo.insertOnce(id,userId,type,title,message,link,category,Boolean.TRUE.equals(pref.getInAppEnabled()),emailStatus,dedupeKey);
        if(inserted==1 && "PENDING".equals(emailStatus)) afterCommit(()->delivery.deliverEmail(id));
        return inserted==1;
    }

    public List<NotificationResponse> list(String email){UUID uid=user(email);return repo.findTop50ByUserIdAndInAppVisibleTrueOrderByCreatedAtDesc(uid).stream().map(this::dto).toList();}
    public NotificationSummary summary(String email){UUID uid=user(email);return new NotificationSummary(repo.countByUserIdAndInAppVisibleTrueAndReadFalse(uid));}

    public List<NotificationResponse> browserFeed(String email,Instant after){
        UUID uid=user(email); NotificationPreference p=preference(uid);
        if(!Boolean.TRUE.equals(p.getBrowserEnabled()))return List.of();
        Instant safeAfter=after==null?Instant.now().minusSeconds(120):after;
        if(safeAfter.isBefore(Instant.now().minusSeconds(86400)))safeAfter=Instant.now().minusSeconds(86400);
        return repo.findTop20ByUserIdAndCreatedAtAfterOrderByCreatedAtAsc(uid,safeAfter).stream().map(this::dto).toList();
    }

    public PreferenceResponse preference(String email){return prefDto(preference(user(email)));}

    @Transactional
    public PreferenceResponse updatePreference(String email,PreferenceUpdate req){
        NotificationPreference p=preference(user(email));
        p.setInAppEnabled(req.inAppEnabled()); p.setEmailEnabled(req.emailEnabled()); p.setBrowserEnabled(req.browserEnabled());
        p.setBookingEnabled(req.bookingEnabled()); p.setReminderEnabled(req.reminderEnabled()); p.setRefundEnabled(req.refundEnabled());
        p.setStaffShiftEnabled(req.staffShiftEnabled()); p.setPromotionEnabled(req.promotionEnabled());
        return prefDto(preferences.save(p));
    }

    @Transactional public NotificationResponse read(UUID id,String email){UUID uid=user(email);UserNotification n=repo.findByIdAndUserId(id,uid).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy thông báo"));n.setRead(true);return dto(repo.save(n));}
    @Transactional public void readAll(String email){UUID uid=user(email);repo.markAllRead(uid);}
    @Transactional public NotificationResponse test(String email){UUID uid=user(email);String key="USER_TEST:"+UUID.randomUUID();boolean created=createOnce(uid,"NOTIFICATION_TEST","Thông báo thử CineBooking","Nếu bạn thấy thông báo này, kênh thông báo trong ứng dụng đang hoạt động.","/notifications",key);if(!created)throw new ApiException(HttpStatus.CONFLICT,"Không có kênh thông báo nào đang bật");return repo.findByUserIdAndDedupeKey(uid,key).map(this::dto).orElseThrow();}
    @Transactional public void delete(UUID id,String email){UUID uid=user(email);UserNotification n=repo.findByIdAndUserId(id,uid).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy thông báo"));repo.delete(n);}

    private void createInternal(UUID userId,String type,String title,String message,String link,String dedupeKey){
        NotificationPreference pref=preference(userId); String category=category(type);
        if(!enabled(pref,category)||noChannel(pref))return;
        UserNotification n=new UserNotification(); n.setUserId(userId); n.setNotificationType(type);n.setTitle(title);n.setMessage(message);n.setLinkUrl(link);n.setCategory(category);n.setInAppVisible(Boolean.TRUE.equals(pref.getInAppEnabled()));n.setDedupeKey(dedupeKey);
        boolean email=Boolean.TRUE.equals(pref.getEmailEnabled()); n.setEmailStatus(email?"PENDING":"SKIPPED"); repo.save(n);
        if(email)afterCommit(()->delivery.deliverEmail(n.getId()));
    }

    private NotificationPreference preference(UUID userId){
        return preferences.findById(userId).orElseGet(()->{NotificationPreference p=new NotificationPreference();p.setUserId(userId);return preferences.save(p);});
    }
    private UUID user(String email){return users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản")).getId();}
    private boolean noChannel(NotificationPreference p){return !Boolean.TRUE.equals(p.getInAppEnabled())&&!Boolean.TRUE.equals(p.getEmailEnabled())&&!Boolean.TRUE.equals(p.getBrowserEnabled());}
    private boolean enabled(NotificationPreference p,String category){return switch(category){case "BOOKING"->Boolean.TRUE.equals(p.getBookingEnabled());case "REMINDER"->Boolean.TRUE.equals(p.getReminderEnabled());case "REFUND"->Boolean.TRUE.equals(p.getRefundEnabled());case "STAFF_SHIFT"->Boolean.TRUE.equals(p.getStaffShiftEnabled());case "PROMOTION"->Boolean.TRUE.equals(p.getPromotionEnabled());default->true;};}
    private String category(String type){String t=type==null?"":type.toUpperCase(Locale.ROOT);if(t.startsWith("REFUND"))return "REFUND";if(t.startsWith("SHOWTIME_REMINDER"))return "REMINDER";if(t.startsWith("STAFF_SHIFT"))return "STAFF_SHIFT";if(t.startsWith("PROMOTION")||t.startsWith("VOUCHER"))return "PROMOTION";if(t.startsWith("WAITLIST")||t.startsWith("PAYMENT")||t.startsWith("BOOKING"))return "BOOKING";return "GENERAL";}
    private NotificationResponse dto(UserNotification n){return new NotificationResponse(n.getId(),n.getNotificationType(),n.getCategory(),n.getTitle(),n.getMessage(),n.getLinkUrl(),Boolean.TRUE.equals(n.getRead()),n.getEmailStatus(),n.getCreatedAt());}
    private PreferenceResponse prefDto(NotificationPreference p){return new PreferenceResponse(Boolean.TRUE.equals(p.getInAppEnabled()),Boolean.TRUE.equals(p.getEmailEnabled()),Boolean.TRUE.equals(p.getBrowserEnabled()),Boolean.TRUE.equals(p.getBookingEnabled()),Boolean.TRUE.equals(p.getReminderEnabled()),Boolean.TRUE.equals(p.getRefundEnabled()),Boolean.TRUE.equals(p.getStaffShiftEnabled()),Boolean.TRUE.equals(p.getPromotionEnabled()),p.getUpdatedAt());}
    private void afterCommit(Runnable action){if(TransactionSynchronizationManager.isSynchronizationActive()){TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCommit(){action.run();}});}else action.run();}
}
