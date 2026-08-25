package com.cinebooking.notification;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.PwaDevice;
import com.cinebooking.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.net.*;
import java.util.*;
import static com.cinebooking.notification.PwaDtos.*;

@Service
public class PwaDeviceService {
    private final PwaDeviceRepository devices;
    private final UserRepository users;
    private final boolean pushEnabled;
    private final String vapidPublicKey;
    private final String vapidPrivateKey;
    private final int ttlSeconds;

    public PwaDeviceService(PwaDeviceRepository devices,UserRepository users,
            @Value("${app.pwa.web-push.enabled:false}") boolean pushEnabled,
            @Value("${app.pwa.web-push.vapid-public-key:}") String vapidPublicKey,
            @Value("${app.pwa.web-push.vapid-private-key:}") String vapidPrivateKey,
            @Value("${app.pwa.web-push.ttl-seconds:3600}") int ttlSeconds){
        this.devices=devices;this.users=users;this.pushEnabled=pushEnabled;this.vapidPublicKey=clean(vapidPublicKey);this.vapidPrivateKey=clean(vapidPrivateKey);this.ttlSeconds=Math.max(60,Math.min(ttlSeconds,86400));
    }

    public PushConfig config(){boolean ready=webPushReady();return new PushConfig(ready,ready?vapidPublicKey:"",ttlSeconds,ready?"VAPID_BACKGROUND":"FOREGROUND_FALLBACK");}
    public boolean webPushReady(){return pushEnabled&&!vapidPublicKey.isBlank()&&!vapidPrivateKey.isBlank();}
    public String vapidPublicKey(){return vapidPublicKey;}
    public String vapidPrivateKey(){return vapidPrivateKey;}
    public int ttlSeconds(){return ttlSeconds;}

    public List<DeviceResponse> list(String email,String currentDeviceKey){
        UUID userId=user(email);
        return devices.findByUserIdOrderByLastSeenAtDesc(userId).stream().map(d->dto(d,currentDeviceKey)).toList();
    }

    @Transactional
    public DeviceResponse register(String email,String deviceKey,DeviceRegistration request){
        UUID userId=user(email); validateDeviceKey(deviceKey);
        boolean requestedPush=Boolean.TRUE.equals(request.pushEnabled());
        if(requestedPush&&!webPushReady())throw new ApiException(HttpStatus.CONFLICT,"Web Push chưa được cấu hình VAPID trên máy chủ");
        if(requestedPush&&(blank(request.endpoint())||blank(request.p256dh())||blank(request.authSecret())))throw new ApiException(HttpStatus.BAD_REQUEST,"Thiếu PushSubscription endpoint/p256dh/auth");
        if(requestedPush){
            validatePushEndpoint(request.endpoint());
            validateSubscriptionKeys(request.p256dh(),request.authSecret());
        }

        if(requestedPush){
            devices.findByPushEndpoint(request.endpoint().trim()).filter(other->!other.getDeviceKey().equals(deviceKey)).ifPresent(other->{
                if(!other.getUserId().equals(userId))throw new ApiException(HttpStatus.CONFLICT,"PushSubscription đã thuộc thiết bị của tài khoản khác");
                other.setPushEnabled(false);other.setPushEndpoint(null);other.setP256dh(null);other.setAuthSecret(null);devices.save(other);
            });
        }

        PwaDevice device=devices.findByDeviceKey(deviceKey).orElseGet(PwaDevice::new);
        if(device.getId()!=null&&!device.getUserId().equals(userId))throw new ApiException(HttpStatus.CONFLICT,"deviceKey đã thuộc tài khoản khác");
        device.setUserId(userId);device.setDeviceKey(deviceKey);
        device.setDeviceLabel(request.deviceLabel().trim());device.setPlatform(request.platform().trim().toUpperCase(Locale.ROOT));
        device.setUserAgent(trim(request.userAgent(),500));device.setStandalone(Boolean.TRUE.equals(request.standalone()));
        device.setLastSeenAt(Instant.now());
        device.setPushEnabled(requestedPush);
        if(requestedPush){device.setPushEndpoint(request.endpoint().trim());device.setP256dh(request.p256dh().trim());device.setAuthSecret(request.authSecret().trim());}
        else{device.setPushEndpoint(null);device.setP256dh(null);device.setAuthSecret(null);device.setFailureCount(0);device.setLastFailureAt(null);}
        device=devices.save(device);
        return dto(device,deviceKey);
    }

    @Transactional
    public void remove(String email,String deviceKey){
        UUID userId=user(email);validateDeviceKey(deviceKey);
        PwaDevice device=devices.findByDeviceKey(deviceKey).orElse(null);
        if(device==null)return;
        if(!device.getUserId().equals(userId))throw new ApiException(HttpStatus.FORBIDDEN,"Thiết bị không thuộc tài khoản hiện tại");
        devices.delete(device);
    }

    @Transactional
    public DeviceResponse seen(String email,String deviceKey){
        UUID userId=user(email);validateDeviceKey(deviceKey);
        PwaDevice device=devices.findByDeviceKey(deviceKey).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Thiết bị PWA chưa được đăng ký"));
        if(!device.getUserId().equals(userId))throw new ApiException(HttpStatus.FORBIDDEN,"Thiết bị không thuộc tài khoản hiện tại");
        device.setLastSeenAt(Instant.now());return dto(devices.save(device),deviceKey);
    }


    private void validatePushEndpoint(String value){
        try{
            URI uri=URI.create(value.trim());
            String host=uri.getHost();
            if(!"https".equalsIgnoreCase(uri.getScheme())||host==null||host.isBlank()||uri.getUserInfo()!=null)throw new IllegalArgumentException();
            String lower=host.toLowerCase(Locale.ROOT);
            if(lower.equals("localhost")||lower.endsWith(".localhost")||lower.endsWith(".local")||lower.endsWith(".internal"))throw new IllegalArgumentException();
            for(InetAddress address:InetAddress.getAllByName(host)){
                byte[] raw=address.getAddress();
                boolean uniqueLocalV6=raw.length==16&&((raw[0]&0xfe)==0xfc);
                if(address.isAnyLocalAddress()||address.isLoopbackAddress()||address.isLinkLocalAddress()||address.isSiteLocalAddress()||address.isMulticastAddress()||uniqueLocalV6)throw new IllegalArgumentException();
            }
        }catch(Exception ex){throw new ApiException(HttpStatus.BAD_REQUEST,"Push endpoint phải là HTTPS public hợp lệ");}
    }
    private void validateSubscriptionKeys(String p256dh,String authSecret){
        try{
            byte[] pub=Base64.getUrlDecoder().decode(p256dh.trim());
            byte[] auth=Base64.getUrlDecoder().decode(authSecret.trim());
            if(pub.length!=65||pub[0]!=4||auth.length!=16)throw new IllegalArgumentException();
        }catch(Exception ex){throw new ApiException(HttpStatus.BAD_REQUEST,"PushSubscription key không hợp lệ");}
    }

    private DeviceResponse dto(PwaDevice d,String current){return new DeviceResponse(d.getId(),d.getDeviceKey(),d.getDeviceLabel(),d.getPlatform(),Boolean.TRUE.equals(d.getStandalone()),Boolean.TRUE.equals(d.getPushEnabled()),d.getFailureCount()==null?0:d.getFailureCount(),d.getLastSeenAt(),d.getLastPushAt(),d.getLastFailureAt(),d.getCreatedAt(),d.getUpdatedAt(),Objects.equals(current,d.getDeviceKey()));}
    private UUID user(String email){return users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản")).getId();}
    private void validateDeviceKey(String key){if(key==null||!key.matches("[A-Za-z0-9_-]{16,80}"))throw new ApiException(HttpStatus.BAD_REQUEST,"deviceKey không hợp lệ");}
    private static boolean blank(String value){return value==null||value.isBlank();}
    private static String clean(String value){return value==null?"":value.trim();}
    private static String trim(String value,int max){if(value==null)return null;String v=value.trim();return v.length()>max?v.substring(0,max):v;}
}
