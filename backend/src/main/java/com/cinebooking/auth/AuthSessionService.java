package com.cinebooking.auth;

import com.cinebooking.audit.AuditLogRepository;
import com.cinebooking.audit.AuditService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.AppUser;
import com.cinebooking.domain.AuthSession;
import com.cinebooking.user.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

import static com.cinebooking.auth.SecurityDtos.*;

@Service
public class AuthSessionService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Base64.Encoder TOKEN_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private final AuthSessionRepository sessions;
    private final UserRepository users;
    private final JwtService jwt;
    private final AuditService audit;
    private final AuditLogRepository auditLogs;
    private final int refreshDays;
    private final boolean cookieSecure;
    private final String cookieName;

    public AuthSessionService(AuthSessionRepository sessions, UserRepository users, JwtService jwt, AuditService audit, AuditLogRepository auditLogs,
                              @Value("${app.security.refresh-token-days:30}") int refreshDays,
                              @Value("${app.security.refresh-cookie-secure:false}") boolean cookieSecure,
                              @Value("${app.security.refresh-cookie-name:cinebooking_refresh}") String cookieName) {
        this.sessions=sessions; this.users=users; this.jwt=jwt; this.audit=audit; this.auditLogs=auditLogs;
        this.refreshDays=Math.max(1, refreshDays); this.cookieSecure=cookieSecure; this.cookieName=cookieName;
    }

    @Transactional
    public AuthResponse create(AppUser user, HttpServletRequest request, HttpServletResponse response) {
        String rawRefresh=randomToken();
        Instant now=Instant.now();
        AuthSession s=new AuthSession();
        s.setUserId(user.getId()); s.setRefreshTokenHash(hash(rawRefresh));
        s.setUserAgent(clean(request.getHeader("User-Agent"),500)); s.setDeviceName(ClientDeviceDetector.deviceName(request));
        s.setIpAddress(ip(request)); s.setCreatedAt(now); s.setLastSeenAt(now); s.setExpiresAt(now.plus(Duration.ofDays(refreshDays)));
        sessions.save(s); setRefreshCookie(response,rawRefresh,Duration.ofDays(refreshDays));
        return authResponse(user,s);
    }

    @Transactional
    public AuthResponse refresh(HttpServletRequest request, HttpServletResponse response) {
        String raw=refreshCookie(request);
        if(raw==null) throw new ApiException(HttpStatus.UNAUTHORIZED,"Không có refresh token");
        AuthSession s=sessions.findByRefreshTokenHash(hash(raw)).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Refresh token không hợp lệ"));
        if(!s.active()){ clearRefreshCookie(response); throw new ApiException(HttpStatus.UNAUTHORIZED,"Phiên đăng nhập đã hết hạn hoặc bị thu hồi"); }
        AppUser user=users.findById(s.getUserId()).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Tài khoản không còn tồn tại"));
        if(!user.isAccountEnabled()){ revoke(s,"ACCOUNT_DISABLED"); clearRefreshCookie(response); throw new ApiException(HttpStatus.UNAUTHORIZED,"Tài khoản đã bị vô hiệu hoá"); }
        String rotated=randomToken();
        s.setRefreshTokenHash(hash(rotated)); s.setLastSeenAt(Instant.now());
        s.setIpAddress(ip(request)); s.setUserAgent(clean(request.getHeader("User-Agent"),500)); s.setDeviceName(ClientDeviceDetector.deviceName(request));
        sessions.save(s); setRefreshCookie(response,rotated,Duration.between(Instant.now(),s.getExpiresAt()));
        return authResponse(user,s);
    }

    public boolean accessSessionActive(UUID sessionId, UUID userId) {
        if(sessionId==null) return false;
        return sessions.findById(sessionId).filter(s->s.getUserId().equals(userId) && s.active()).isPresent();
    }

    @Transactional
    public void logout(UUID sessionId, HttpServletRequest request, HttpServletResponse response, String email) {
        AuthSession s=null;
        if(sessionId!=null) s=sessions.findById(sessionId).orElse(null);
        if(s==null){String raw=refreshCookie(request); if(raw!=null) s=sessions.findByRefreshTokenHash(hash(raw)).orElse(null);}
        if(s!=null && s.getRevokedAt()==null){
            if(email==null) email=users.findById(s.getUserId()).map(AppUser::getEmail).orElse(null);
            revoke(s,"LOGOUT"); audit.record(email,"SESSION_LOGOUT","AUTH_SESSION",s.getId().toString(),"Đăng xuất phiên",ip(request));
        }
        clearRefreshCookie(response);
    }

    public List<SessionView> mySessions(UUID userId, UUID currentSessionId){
        return sessions.findTop50ByUserIdOrderByLastSeenAtDesc(userId).stream().map(s->view(s,currentSessionId)).toList();
    }

    public List<LoginEventView> loginEvents(String email){
        return auditLogs.findTop30ByActorEmailIgnoreCaseAndActionInOrderByCreatedAtDesc(email,List.of("LOGIN_SUCCESS","LOGIN_FAILED","LOGIN_BLOCKED"))
                .stream().map(x->new LoginEventView(x.getAction(),x.getDetails(),x.getIpAddress(),x.getCreatedAt())).toList();
    }

    @Transactional
    public void revokeOwn(UUID userId, UUID sessionId, UUID currentSessionId, String email){
        AuthSession s=sessions.findById(sessionId).filter(x->x.getUserId().equals(userId)).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy phiên đăng nhập"));
        if(s.getRevokedAt()==null){revoke(s,"USER_REVOKED"); audit.record(email,"SESSION_REVOKED","AUTH_SESSION",s.getId().toString(),s.getId().equals(currentSessionId)?"Thu hồi phiên hiện tại":"Thu hồi phiên thiết bị khác",null);}
    }

    @Transactional
    public int revokeOthers(UUID userId, UUID currentSessionId, String email){
        int count=0; for(AuthSession s:sessions.findByUserIdOrderByLastSeenAtDesc(userId)) if(s.active()&&!s.getId().equals(currentSessionId)){revoke(s,"USER_REVOKED_OTHERS");count++;}
        if(count>0) audit.record(email,"SESSIONS_REVOKED","USER",userId.toString(),"Thu hồi "+count+" phiên thiết bị khác",null); return count;
    }

    @Transactional
    public int revokeAllForUser(UUID userId, String reason, String actorEmail){
        int count=0; for(AuthSession s:sessions.findByUserIdOrderByLastSeenAtDesc(userId)) if(s.active()){revoke(s,reason);count++;}
        if(count>0) audit.record(actorEmail,"SESSIONS_REVOKED","USER",userId.toString(),"Thu hồi "+count+" phiên: "+reason,null); return count;
    }

    @Transactional
    public int revokeAllExcept(UUID userId, UUID keepSessionId, String reason, String actorEmail){
        int count=0; for(AuthSession s:sessions.findByUserIdOrderByLastSeenAtDesc(userId)) if(s.active()&&(keepSessionId==null||!s.getId().equals(keepSessionId))){revoke(s,reason);count++;}
        if(count>0) audit.record(actorEmail,"SESSIONS_REVOKED","USER",userId.toString(),"Thu hồi "+count+" phiên: "+reason,null); return count;
    }

    public List<SessionView> adminSessions(UUID userId){return sessions.findTop50ByUserIdOrderByLastSeenAtDesc(userId).stream().map(s->view(s,null)).toList();}

    public UUID sessionIdFromAuthorization(String authorization){
        if(authorization==null||!authorization.startsWith("Bearer ")) return null;
        try{return jwt.verify(authorization.substring(7)).sessionId();}catch(RuntimeException e){return null;}
    }

    private AuthResponse authResponse(AppUser user, AuthSession s){
        JwtService.Token issued=jwt.create(user.getEmail(),user.getRole().name(),s.getId());
        return new AuthResponse(issued.value(),issued.expiresAt(),s.getId().toString(),user.getId().toString(),user.getEmail(),user.getFullName(),user.getRole().name());
    }
    private SessionView view(AuthSession s, UUID current){return new SessionView(s.getId(),s.getDeviceName(),s.getIpAddress(),s.getCreatedAt(),s.getLastSeenAt(),s.getExpiresAt(),s.getRevokedAt(),s.getRevokeReason(),current!=null&&current.equals(s.getId()),s.active());}
    private void revoke(AuthSession s,String reason){s.setRevokedAt(Instant.now());s.setRevokeReason(reason);sessions.save(s);}
    private String randomToken(){byte[] b=new byte[48];RANDOM.nextBytes(b);return TOKEN_ENCODER.encodeToString(b);}
    private String hash(String raw){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
    private String refreshCookie(HttpServletRequest request){Cookie[] cs=request.getCookies();if(cs==null)return null;for(Cookie c:cs)if(cookieName.equals(c.getName()))return c.getValue();return null;}
    private void setRefreshCookie(HttpServletResponse response,String token,Duration maxAge){long seconds=Math.max(1,maxAge.getSeconds());ResponseCookie c=ResponseCookie.from(cookieName,token).httpOnly(true).secure(cookieSecure).sameSite("Lax").path("/api/auth").maxAge(seconds).build();response.addHeader(HttpHeaders.SET_COOKIE,c.toString());}
    public void clearRefreshCookie(HttpServletResponse response){ResponseCookie c=ResponseCookie.from(cookieName,"").httpOnly(true).secure(cookieSecure).sameSite("Lax").path("/api/auth").maxAge(0).build();response.addHeader(HttpHeaders.SET_COOKIE,c.toString());}
    public static String ip(HttpServletRequest r){String x=r.getHeader("X-Forwarded-For");return x==null||x.isBlank()?r.getRemoteAddr():x.split(",")[0].trim();}
    private String clean(String v,int max){if(v==null||v.isBlank())return null;v=v.trim();return v.length()<=max?v:v.substring(0,max);}
}
