package com.cinebooking.notification;

import com.cinebooking.domain.PwaDevice;
import com.cinebooking.domain.UserNotification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import static com.cinebooking.notification.WebPushSender.DeliveryResult;

@Service
public class WebPushDeliveryService {
    private final NotificationRepository notifications;
    private final PwaDeviceRepository devices;
    private final PwaDeviceService config;
    private final WebPushSender sender;

    public WebPushDeliveryService(NotificationRepository notifications,PwaDeviceRepository devices,PwaDeviceService config,WebPushSender sender){this.notifications=notifications;this.devices=devices;this.config=config;this.sender=sender;}

    @Transactional(propagation=Propagation.REQUIRES_NEW)
    public void deliver(java.util.UUID notificationId){
        if(!config.webPushReady())return;
        UserNotification notification=notifications.findById(notificationId).orElse(null);if(notification==null)return;
        List<PwaDevice> targets=devices.findByUserIdAndPushEnabledTrueOrderByLastSeenAtDesc(notification.getUserId());
        if(targets.isEmpty())return;
        String payload=payload(notification);
        for(PwaDevice device:targets){
            DeliveryResult result=sender.send(device,payload);Instant now=Instant.now();
            if(result.success()){
                device.setFailureCount(0);device.setLastPushAt(now);device.setLastFailureAt(null);
            }else{
                device.setFailureCount((device.getFailureCount()==null?0:device.getFailureCount())+1);device.setLastFailureAt(now);
                if(result.gone()||device.getFailureCount()>=5){device.setPushEnabled(false);device.setPushEndpoint(null);device.setP256dh(null);device.setAuthSecret(null);}
            }
            devices.save(device);
        }
    }

    private String payload(UserNotification n){
        return "{"+
                "\"id\":\""+escape(n.getId().toString())+"\","+
                "\"title\":\""+escape(n.getTitle())+"\","+
                "\"body\":\""+escape(n.getMessage())+"\","+
                "\"url\":\""+escape(n.getLinkUrl()==null?"/notifications":n.getLinkUrl())+"\","+
                "\"category\":\""+escape(n.getCategory()==null?"GENERAL":n.getCategory())+"\","+
                "\"priority\":\""+escape(n.getPriority()==null?"NORMAL":n.getPriority())+"\","+
                "\"createdAt\":\""+escape(n.getCreatedAt()==null?Instant.now().toString():n.getCreatedAt().toString())+"\"}";
    }
    private String escape(String value){if(value==null)return "";return value.replace("\\","\\\\").replace("\"","\\\"").replace("\n","\\n").replace("\r","\\r");}
}
