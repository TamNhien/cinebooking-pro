package com.cinebooking.security;

import com.cinebooking.auth.AuthSessionRepository;
import com.cinebooking.auth.ClientDeviceDetector;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.AppUser;
import com.cinebooking.domain.AuthSession;
import com.cinebooking.domain.SecurityAlert;
import com.cinebooking.domain.TrustedDevice;
import com.cinebooking.notification.NotificationService;
import com.cinebooking.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static com.cinebooking.security.SecurityProtectionDtos.*;

@Service
public class SecurityProtectionService {
    private final TrustedDeviceRepository devices;
    private final SecurityAlertRepository alerts;
    private final AuthSessionRepository sessions;
    private final UserRepository users;
    private final NotificationService notifications;

    public SecurityProtectionService(TrustedDeviceRepository devices, SecurityAlertRepository alerts, AuthSessionRepository sessions, UserRepository users, NotificationService notifications) {
        this.devices=devices; this.alerts=alerts; this.sessions=sessions; this.users=users; this.notifications=notifications;
    }

    @Transactional
    public void successfulLogin(AppUser user, UUID sessionId, HttpServletRequest request) {
        AuthSession session=sessions.findById(sessionId).orElse(null);
        if(session==null)return;
        // create() already resolved the frontend browser hint into deviceName.
        String fingerprint=fingerprint(session.getUserAgent(),session.getDeviceName());
        TrustedDevice trusted=findTrustedWithLegacyFallback(user.getId(),session,fingerprint);
        if(trusted!=null && trusted.active()){
            migrateTrustedDeviceMetadata(trusted,session,fingerprint,session.getDeviceName());
            return;
        }
        createAlert(user.getId(),"NEW_DEVICE",SecurityRiskRules.severity("NEW_DEVICE"),SecurityRiskRules.score("NEW_DEVICE"),"Đăng nhập từ thiết bị chưa tin cậy","CineBooking phát hiện phiên đăng nhập mới. Nếu không phải bạn, hãy thu hồi phiên và đổi mật khẩu.",session.getIpAddress(),session.getDeviceName(),sessionId,true);
    }

    @Transactional(propagation=Propagation.REQUIRES_NEW)
    public void credentialAttack(String email, String ip, HttpServletRequest request) {
        users.findByEmailIgnoreCase(email).ifPresent(user->createAlert(user.getId(),"CREDENTIAL_ATTACK",SecurityRiskRules.severity("CREDENTIAL_ATTACK"),SecurityRiskRules.score("CREDENTIAL_ATTACK"),"Nhiều lần đăng nhập thất bại","Cơ chế chống brute-force đã kích hoạt giới hạn đăng nhập cho tài khoản hoặc địa chỉ mạng.",ip,ClientDeviceDetector.deviceName(request),null,true));
    }

    @Transactional
    public void passwordChanged(UUID userId,boolean reset) {
        createAlert(userId,reset?"PASSWORD_RESET":"PASSWORD_CHANGED",SecurityRiskRules.severity(reset?"PASSWORD_RESET":"PASSWORD_CHANGED"),SecurityRiskRules.score(reset?"PASSWORD_RESET":"PASSWORD_CHANGED"),reset?"Mật khẩu đã được đặt lại":"Mật khẩu đã được thay đổi",reset?"Mật khẩu được đặt lại qua quy trình khôi phục. Tất cả phiên cũ đã bị thu hồi.":"Mật khẩu tài khoản vừa được thay đổi. Các thiết bị khác đã bị đăng xuất.",null,null,null,true);
    }

    public SecurityOverview overview(UUID userId) {
        long activeSessions=sessions.findByUserIdOrderByLastSeenAtDesc(userId).stream().filter(AuthSession::active).count();
        return new SecurityOverview(activeSessions,devices.countByUserIdAndRevokedAtIsNull(userId),alerts.countByUserIdAndAcknowledgedAtIsNull(userId),alerts.countByUserIdAndAcknowledgedAtIsNullAndSeverityIn(userId,List.of("HIGH","CRITICAL")),Instant.now());
    }

    public List<TrustedDeviceView> trustedDevices(UUID userId){return devices.findByUserIdOrderByLastSeenAtDesc(userId).stream().map(this::deviceView).toList();}
    public List<SecurityAlertView> alerts(UUID userId){return alerts.findTop100ByUserIdOrderByCreatedAtDesc(userId).stream().map(this::alertView).toList();}

    /**
     * Refreshes display-only client metadata for the current authenticated session.
     * This is useful for Brave because its normal User-Agent intentionally looks
     * like Chrome. Existing V46 rows created before this patch are repaired in-place.
     */
    @Transactional
    public ClientContextView syncCurrentClient(UUID userId, UUID currentSessionId, HttpServletRequest request) {
        if(currentSessionId==null)throw new ApiException(HttpStatus.BAD_REQUEST,"Không xác định được phiên hiện tại");
        AuthSession session=sessions.findById(currentSessionId).filter(s->s.getUserId().equals(userId)&&s.active()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Phiên hiện tại không còn hoạt động"));
        String oldDeviceName=session.getDeviceName();
        String requestUa=clean(request.getHeader("User-Agent"),500);
        String ua=requestUa==null?session.getUserAgent():requestUa;
        String deviceName=ClientDeviceDetector.deviceName(ua,request.getHeader(ClientDeviceDetector.BROWSER_HEADER));
        session.setUserAgent(ua);
        session.setDeviceName(deviceName);
        session.setIpAddress(currentIp(request,session.getIpAddress()));
        session.setLastSeenAt(Instant.now());
        sessions.save(session);

        String newFingerprint=fingerprint(ua,deviceName);
        TrustedDevice trusted=findTrustedForSync(userId,ua,oldDeviceName,newFingerprint);
        if(trusted!=null){
            String previousName=trusted.getDeviceName();
            migrateTrustedDeviceMetadata(trusted,session,newFingerprint,deviceName);
            // Preserve a custom label, but repair the old auto-generated "Chrome · Windows" label.
            if(trusted.getLabel()==null||trusted.getLabel().isBlank()||Objects.equals(trusted.getLabel(),oldDeviceName)||Objects.equals(trusted.getLabel(),previousName)){
                trusted.setLabel(deviceName);
                devices.save(trusted);
            }
        }

        for(SecurityAlert alert:alerts.findByRelatedSessionId(currentSessionId)){
            if(alert.getDeviceName()==null||Objects.equals(alert.getDeviceName(),oldDeviceName)){
                alert.setDeviceName(deviceName);
                alerts.save(alert);
            }
        }
        return new ClientContextView(deviceName,ClientDeviceDetector.browser(ua,request.getHeader(ClientDeviceDetector.BROWSER_HEADER)),ClientDeviceDetector.operatingSystem(ua),session.getIpAddress());
    }

    @Transactional
    public TrustedDeviceView trustCurrent(UUID userId,UUID currentSessionId,String label) {
        if(currentSessionId==null)throw new ApiException(HttpStatus.BAD_REQUEST,"Không xác định được phiên hiện tại");
        AuthSession session=sessions.findById(currentSessionId).filter(s->s.getUserId().equals(userId)&&s.active()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Phiên hiện tại không còn hoạt động"));
        String fp=fingerprint(session.getUserAgent(),session.getDeviceName());
        TrustedDevice d=findTrustedWithLegacyFallback(userId,session,fp);
        if(d==null)d=new TrustedDevice();
        d.setUserId(userId);d.setDeviceFingerprint(fp);d.setLabel(clean(label,session.getDeviceName()));d.setDeviceName(session.getDeviceName());d.setUserAgent(session.getUserAgent());
        if(d.getFirstIp()==null)d.setFirstIp(session.getIpAddress());d.setLastIp(session.getIpAddress());d.setLastSeenAt(Instant.now());d.setRevokedAt(null);
        return deviceView(devices.save(d));
    }

    @Transactional
    public void revokeTrustedDevice(UUID userId,UUID deviceId) {
        TrustedDevice d=devices.findById(deviceId).filter(x->x.getUserId().equals(userId)).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy thiết bị tin cậy"));
        if(d.getRevokedAt()==null){d.setRevokedAt(Instant.now());devices.save(d);}
    }

    @Transactional
    public SecurityAlertView acknowledge(UUID userId,UUID alertId) {
        SecurityAlert a=alerts.findById(alertId).filter(x->x.getUserId().equals(userId)).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy cảnh báo bảo mật"));
        if(a.getAcknowledgedAt()==null){a.setAcknowledgedAt(Instant.now());a.setAcknowledgedBy(userId);alerts.save(a);}return alertView(a);
    }

    public AdminSecuritySummary adminSummary(){return new AdminSecuritySummary(alerts.countByCreatedAtAfter(Instant.now().minus(24,ChronoUnit.HOURS)),alerts.countByAcknowledgedAtIsNull(),alerts.countByAcknowledgedAtIsNullAndSeverityIn(List.of("HIGH","CRITICAL")),devices.countByRevokedAtIsNull(),Instant.now());}
    public List<AdminSecurityAlertView> adminAlerts(){return alerts.findTop200ByOrderByCreatedAtDesc().stream().map(this::adminAlertView).toList();}

    private SecurityAlert createAlert(UUID userId,String type,String severity,int risk,String title,String details,String ip,String deviceName,UUID sessionId,boolean notify){
        SecurityAlert a=new SecurityAlert();a.setUserId(userId);a.setEventType(type);a.setSeverity(severity);a.setRiskScore(risk);a.setTitle(title);a.setDetails(details);a.setIpAddress(ip);a.setDeviceName(deviceName);a.setRelatedSessionId(sessionId);alerts.save(a);
        if(notify && ("HIGH".equals(severity)||"CRITICAL".equals(severity)))notifications.createOnce(userId,"SECURITY_ALERT",title,details,"/security","SECURITY_ALERT:"+a.getId());
        return a;
    }

    private TrustedDevice findTrustedWithLegacyFallback(UUID userId,AuthSession session,String newFingerprint){
        TrustedDevice current=devices.findByUserIdAndDeviceFingerprint(userId,newFingerprint).orElse(null);
        if(current!=null)return current;
        String legacy=legacyFingerprint(session.getUserAgent());
        TrustedDevice old=devices.findByUserIdAndDeviceFingerprint(userId,legacy).orElse(null);
        if(old!=null)migrateTrustedDeviceMetadata(old,session,newFingerprint,session.getDeviceName());
        return old;
    }

    private TrustedDevice findTrustedForSync(UUID userId,String ua,String oldDeviceName,String newFingerprint){
        TrustedDevice current=devices.findByUserIdAndDeviceFingerprint(userId,newFingerprint).orElse(null);
        if(current!=null)return current;
        if(oldDeviceName!=null){
            TrustedDevice oldIdentity=devices.findByUserIdAndDeviceFingerprint(userId,fingerprint(ua,oldDeviceName)).orElse(null);
            if(oldIdentity!=null)return oldIdentity;
        }
        return devices.findByUserIdAndDeviceFingerprint(userId,legacyFingerprint(ua)).orElse(null);
    }

    private void migrateTrustedDeviceMetadata(TrustedDevice d,AuthSession session,String fingerprint,String deviceName){
        d.setDeviceFingerprint(fingerprint);d.setDeviceName(deviceName);d.setUserAgent(session.getUserAgent());d.setLastIp(session.getIpAddress());d.setLastSeenAt(Instant.now());devices.save(d);
    }

    private TrustedDeviceView deviceView(TrustedDevice d){return new TrustedDeviceView(d.getId(),d.getLabel(),d.getDeviceName(),d.getFirstIp(),d.getLastIp(),d.getTrustedAt(),d.getLastSeenAt(),d.getRevokedAt(),d.active());}
    private AdminSecurityAlertView adminAlertView(SecurityAlert a){AppUser u=users.findById(a.getUserId()).orElse(null);return new AdminSecurityAlertView(a.getId(),a.getUserId(),u==null?"—":u.getEmail(),u==null?"—":u.getFullName(),a.getEventType(),a.getSeverity(),a.getRiskScore()==null?0:a.getRiskScore(),a.getTitle(),a.getDetails(),a.getIpAddress(),a.getDeviceName(),a.getRelatedSessionId(),a.getAcknowledgedAt(),a.getCreatedAt());}
    private SecurityAlertView alertView(SecurityAlert a){return new SecurityAlertView(a.getId(),a.getEventType(),a.getSeverity(),a.getRiskScore()==null?0:a.getRiskScore(),a.getTitle(),a.getDetails(),a.getIpAddress(),a.getDeviceName(),a.getRelatedSessionId(),a.getAcknowledgedAt(),a.getCreatedAt());}
    private String fingerprint(String userAgent,String deviceName){return sha256((userAgent==null?"unknown":userAgent.trim().toLowerCase(Locale.ROOT))+"|"+(deviceName==null?"unknown":deviceName.trim().toLowerCase(Locale.ROOT)));}
    private String legacyFingerprint(String userAgent){return sha256(userAgent==null?"unknown":userAgent.trim().toLowerCase(Locale.ROOT));}
    private String sha256(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
    private String clean(String label,String fallback){return label==null||label.isBlank()?fallback:label.trim();}
    private String clean(String value,int max){if(value==null||value.isBlank())return null;String v=value.trim();return v.length()<=max?v:v.substring(0,max);}
    private String currentIp(HttpServletRequest request,String fallback){String forwarded=request.getHeader("X-Forwarded-For");if(forwarded!=null&&!forwarded.isBlank())return forwarded.split(",")[0].trim();String remote=request.getRemoteAddr();return remote==null||remote.isBlank()?fallback:remote;}
}
