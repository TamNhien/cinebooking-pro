package com.cinebooking.identity;

import com.cinebooking.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Component
public class StepUpAuthorizationFilter extends OncePerRequestFilter {
    public static final String HEADER="X-Step-Up-Token";
    private final StepUpAuthenticationService service;
    private final UserRepository users;
    public StepUpAuthorizationFilter(StepUpAuthenticationService service,UserRepository users){this.service=service;this.users=users;}

    @Override protected boolean shouldNotFilter(HttpServletRequest request){return !protectedAction(request.getMethod(),request.getRequestURI());}

    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        if(!service.enabled()){chain.doFilter(request,response);return;}
        Authentication auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null||!auth.isAuthenticated()){chain.doFilter(request,response);return;}
        boolean admin=auth.getAuthorities().stream().anyMatch(a->"ROLE_ADMIN".equals(a.getAuthority()));
        if(!admin){chain.doFilter(request,response);return;}
        UUID sessionId=auth.getDetails() instanceof UUID u?u:null;
        UUID userId=users.findByEmailIgnoreCase(auth.getName()).map(x->x.getId()).orElse(null);
        if(!service.verifyAndTouch(userId,sessionId,request.getHeader(HEADER),request.getMethod()+" "+request.getRequestURI())){
            response.setStatus(428);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setHeader("X-Step-Up-Required","true");
            response.getWriter().write("{\"message\":\"Thao tác nhạy cảm yêu cầu xác thực tăng cường V68. Hãy mở Security & Identity, nhập lại mật khẩu Admin rồi thử lại.\"}");
            return;
        }
        chain.doFilter(request,response);
    }

    static boolean protectedAction(String method,String path){
        if(path==null||method==null) return false;
        boolean mutate=!"GET".equalsIgnoreCase(method)&&!"HEAD".equalsIgnoreCase(method)&&!"OPTIONS".equalsIgnoreCase(method);
        if(!mutate) return false;
        if(path.startsWith("/api/admin/users")) return true;
        if(path.startsWith("/api/admin/staff")) return true;
        if(path.startsWith("/api/admin/payment-resilience")) return true;
        if(path.startsWith("/api/admin/disaster-recovery")) return true;
        if(path.startsWith("/api/admin/privacy-governance")) return true;
        if(path.startsWith("/api/admin/key-governance")) return true;
        if(path.startsWith("/api/admin/supply-chain")) return true;
        if(path.startsWith("/api/admin/pricing/rules")) return true;
        if(path.equals("/api/admin/marketing/campaigns/launch")) return true;
        if(path.equals("/api/admin/crm-automation/execute")) return true;
        if(path.startsWith("/api/admin/refunds/")) return true;
        if(path.startsWith("/api/admin/security/users/") && "DELETE".equalsIgnoreCase(method)) return true;
        if(path.startsWith("/api/admin/booking-ops/")){
            return path.endsWith("/cancel")||path.endsWith("/refund-request")||path.endsWith("/refund-approve")||path.endsWith("/refund-reject")||path.endsWith("/manual-checkin");
        }
        return false;
    }
}
