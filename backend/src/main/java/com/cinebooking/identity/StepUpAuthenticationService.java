package com.cinebooking.identity;

import com.cinebooking.audit.AuditService;
import com.cinebooking.auth.AuthSessionRepository;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.AppUser;
import com.cinebooking.domain.AuthSession;
import com.cinebooking.domain.Role;
import com.cinebooking.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

import static com.cinebooking.identity.StepUpDtos.*;

@Service
public class StepUpAuthenticationService {
    public static final String STRATEGY_VERSION="V68-SECURITY-IDENTITY-5";
    public static final int PROTECTED_ACTION_GROUPS=8;
    private static final SecureRandom RANDOM=new SecureRandom();

    private final AdminStepUpGrantRepository grants;
    private final UserRepository users;
    private final AuthSessionRepository sessions;
    private final PasswordEncoder encoder;
    private final AuditService audit;
    private final boolean enabled;
    private final long ttlSeconds;

    public StepUpAuthenticationService(AdminStepUpGrantRepository grants, UserRepository users,
                                       AuthSessionRepository sessions, PasswordEncoder encoder, AuditService audit,
                                       @Value("${app.security.step-up.enabled:true}") boolean enabled,
                                       @Value("${app.security.step-up.ttl-seconds:600}") long ttlSeconds) {
        this.grants=grants; this.users=users; this.sessions=sessions; this.encoder=encoder; this.audit=audit;
        this.enabled=enabled; this.ttlSeconds=Math.max(60,Math.min(1800,ttlSeconds));
    }

    public boolean enabled(){ return enabled; }
    public long ttlSeconds(){ return ttlSeconds; }

    @Transactional
    public StepUpGrantResponse issue(String email, UUID sessionId, String password, String ip) {
        if(!enabled) throw new ApiException(HttpStatus.CONFLICT,"Xác thực tăng cường đang bị tắt bởi cấu hình hệ thống");
        if(sessionId==null) throw new ApiException(HttpStatus.BAD_REQUEST,"Không xác định được phiên đăng nhập hiện tại");
        AppUser user=users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản"));
        if(user.getRole()!=Role.ADMIN) throw new ApiException(HttpStatus.FORBIDDEN,"Xác thực tăng cường V68 chỉ áp dụng cho ADMIN");
        AuthSession session=sessions.findById(sessionId).filter(s->s.getUserId().equals(user.getId())&&s.active())
                .orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Phiên đăng nhập không còn hoạt động"));
        if(!encoder.matches(password,user.getPasswordHash())){
            audit.record(email,"ADMIN_STEP_UP_FAILED","AUTH_SESSION",sessionId.toString(),"V68 step-up bị từ chối do mật khẩu xác nhận không đúng",ip);
            throw new ApiException(HttpStatus.FORBIDDEN,"Mật khẩu xác nhận không đúng");
        }
        Instant now=Instant.now();
        grants.revokeActiveForSession(sessionId,now,"SUPERSEDED");
        String raw=randomToken();
        AdminStepUpGrant grant=new AdminStepUpGrant();
        grant.setUserId(user.getId()); grant.setSessionId(sessionId); grant.setTokenHash(hash(raw));
        grant.setIssuedAt(now); grant.setExpiresAt(now.plusSeconds(ttlSeconds));
        grants.save(grant);
        audit.record(email,"ADMIN_STEP_UP_GRANTED","AUTH_SESSION",sessionId.toString(),"V68 step-up được cấp trong "+ttlSeconds+" giây",ip);
        return new StepUpGrantResponse(raw,grant.getIssuedAt(),grant.getExpiresAt(),ttlSeconds,STRATEGY_VERSION);
    }

    @Transactional
    public boolean verifyAndTouch(UUID userId, UUID sessionId, String rawToken, String action) {
        if(!enabled) return true;
        AdminStepUpGrant grant=validGrant(userId,sessionId,rawToken);
        if(grant==null) return false;
        grant.setLastUsedAt(Instant.now());
        grants.save(grant);
        return true;
    }

    public StepUpStatusResponse status(UUID userId, UUID sessionId, String rawToken) {
        if(!enabled) return new StepUpStatusResponse(false,true,null,ttlSeconds,STRATEGY_VERSION);
        AdminStepUpGrant grant=validGrant(userId,sessionId,rawToken);
        return new StepUpStatusResponse(true,grant!=null,grant==null?null:grant.getExpiresAt(),ttlSeconds,STRATEGY_VERSION);
    }

    @Transactional
    public void revokeCurrent(UUID userId, UUID sessionId, String rawToken, String email, String ip) {
        AdminStepUpGrant grant=validGrant(userId,sessionId,rawToken);
        if(grant==null) return;
        grant.setRevokedAt(Instant.now()); grant.setRevokeReason("USER_REVOKED"); grants.save(grant);
        audit.record(email,"ADMIN_STEP_UP_REVOKED","AUTH_SESSION",sessionId.toString(),"V68 step-up hiện tại đã bị thu hồi",ip);
    }

    public AdminIdentitySecuritySummary adminSummary(){
        return new AdminIdentitySecuritySummary(STRATEGY_VERSION,enabled,ttlSeconds,
                grants.countByRevokedAtIsNullAndExpiresAtAfter(Instant.now()),PROTECTED_ACTION_GROUPS,
                "SESSION_STORAGE_ONLY","BASELINE_CSP_SELF_PLUS_NEXT_RUNTIME",true,Instant.now());
    }

    private AdminStepUpGrant validGrant(UUID userId, UUID sessionId, String rawToken){
        if(userId==null||sessionId==null||rawToken==null||rawToken.isBlank()) return null;
        return grants.findByTokenHash(hash(rawToken)).filter(g->g.getUserId().equals(userId))
                .filter(g->g.getSessionId().equals(sessionId)).filter(AdminStepUpGrant::active).orElse(null);
    }

    private String randomToken(){ byte[] bytes=new byte[48]; RANDOM.nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    private String hash(String raw){
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));}
        catch(Exception e){throw new IllegalStateException("Cannot hash step-up token",e);}
    }
}
