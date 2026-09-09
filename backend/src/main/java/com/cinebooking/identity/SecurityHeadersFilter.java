package com.cinebooking.identity;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class SecurityHeadersFilter extends OncePerRequestFilter {
    static final String CSP="default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; " +
            "img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: wss:; worker-src 'self' blob:";

    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        response.setHeader("X-Content-Type-Options","nosniff");
        response.setHeader("X-Frame-Options","DENY");
        response.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
        response.setHeader("Permissions-Policy","camera=(), microphone=(), geolocation=(), payment=()");
        response.setHeader("Content-Security-Policy",CSP);
        if(isHttps(request)) response.setHeader("Strict-Transport-Security","max-age=31536000; includeSubDomains");
        chain.doFilter(request,response);
    }
    private boolean isHttps(HttpServletRequest request){
        if(request.isSecure()) return true;
        String forwarded=request.getHeader("X-Forwarded-Proto");
        return forwarded!=null&&"https".equalsIgnoreCase(forwarded.split(",")[0].trim());
    }
}
