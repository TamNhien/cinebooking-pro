package com.cinebooking.auth;

import com.cinebooking.audit.AuditService;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.AppUser;
import com.cinebooking.domain.Role;
import com.cinebooking.user.UserRepository;
import com.cinebooking.security.SecurityProtectionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users; private final PasswordEncoder passwordEncoder; private final LoginRateLimitService limiter; private final AuditService audit; private final AuthSessionService sessions; private final SecurityProtectionService protection;
    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, LoginRateLimitService limiter, AuditService audit, AuthSessionService sessions, SecurityProtectionService protection) {this.users=users;this.passwordEncoder=passwordEncoder;this.limiter=limiter;this.audit=audit;this.sessions=sessions;this.protection=protection;}

    @Transactional public AuthResponse register(RegisterRequest req, HttpServletRequest request, HttpServletResponse response) {
        String email=req.email().trim().toLowerCase(); if(users.existsByEmailIgnoreCase(email))throw new ApiException(HttpStatus.CONFLICT,"Email đã tồn tại");
        AppUser user=new AppUser();user.setEmail(email);user.setFullName(req.fullName().trim());user.setPasswordHash(passwordEncoder.encode(req.password()));user.setRole(Role.USER);users.save(user);audit.record(email,"REGISTER","USER",user.getId().toString(),"Đăng ký tài khoản",AuthSessionService.ip(request));return sessions.create(user,request,response);
    }

    @Transactional public AuthResponse login(LoginRequest req, HttpServletRequest request, HttpServletResponse response) {
        String email=req.email().trim().toLowerCase(); String ip=AuthSessionService.ip(request); limiter.assertAllowed(email,ip);
        AppUser user=users.findByEmailIgnoreCase(email).orElse(null);
        if(user==null||!passwordEncoder.matches(req.password(),user.getPasswordHash())){boolean locked=limiter.failed(email,ip);audit.record(email,"LOGIN_FAILED","USER",null,"Sai email hoặc mật khẩu",ip);if(locked)protection.credentialAttack(email,ip,request.getHeader("User-Agent"));throw new ApiException(HttpStatus.UNAUTHORIZED,"Email hoặc mật khẩu không đúng");}
        if(!user.isAccountEnabled()){audit.record(email,"LOGIN_BLOCKED","USER",user.getId().toString(),"Tài khoản đã bị vô hiệu hoá",ip);throw new ApiException(HttpStatus.FORBIDDEN,"Tài khoản đã bị vô hiệu hoá. Vui lòng liên hệ quản trị viên");}
        limiter.success(email,ip); if(passwordEncoder.upgradeEncoding(user.getPasswordHash())){user.setPasswordHash(passwordEncoder.encode(req.password()));users.save(user);} audit.record(email,"LOGIN_SUCCESS","USER",user.getId().toString(),"Đăng nhập thành công",ip);AuthResponse result=sessions.create(user,request,response);protection.successfulLogin(user,java.util.UUID.fromString(result.sessionId()),request);return result;
    }
}
