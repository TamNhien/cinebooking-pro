package com.cinebooking.audit;

import jakarta.servlet.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import java.util.Set;

@Component
public class AdminAuditInterceptor implements HandlerInterceptor {
    private static final Set<String> WRITES=Set.of("POST","PUT","PATCH","DELETE");
    private final AuditService audit; public AdminAuditInterceptor(AuditService audit){this.audit=audit;}
    @Override public void afterCompletion(HttpServletRequest req,HttpServletResponse res,Object handler,Exception ex){
        if(!req.getRequestURI().startsWith("/api/admin/")||!WRITES.contains(req.getMethod())||res.getStatus()>=400)return;
        Authentication a=SecurityContextHolder.getContext().getAuthentication();if(a==null||!a.isAuthenticated())return;
        String ip=req.getHeader("X-Forwarded-For");if(ip==null||ip.isBlank())ip=req.getRemoteAddr();else ip=ip.split(",")[0].trim();
        try{audit.record(a.getName(),"ADMIN_"+req.getMethod(),"HTTP",req.getRequestURI(),"status="+res.getStatus(),ip);}catch(Exception ignored){}
    }
}
