package com.cinebooking.auth;

import com.cinebooking.user.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRepository users;
    private final AuthSessionService sessions;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository users, AuthSessionService sessions) {
        this.jwtService = jwtService;
        this.users = users;
        this.sessions = sessions;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String auth = request.getHeader("Authorization");
        if (auth != null && auth.startsWith("Bearer ") && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                var claims = jwtService.verify(auth.substring(7));
                var user = users.findByEmailIgnoreCase(claims.subject()).orElse(null);
                if (user == null) {
                    unauthorized(response, "Tài khoản của phiên đăng nhập không còn tồn tại");
                    return;
                }
                if (!user.isAccountEnabled()) {
                    unauthorized(response, "Tài khoản đã bị vô hiệu hoá");
                    return;
                }
                if (!sessions.accessSessionActive(claims.sessionId(), user.getId())) {
                    unauthorized(response, "Phiên đăng nhập đã bị thu hồi hoặc hết hạn");
                    return;
                }
                var authentication = new UsernamePasswordAuthenticationToken(
                        user.getEmail(), null, List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
                authentication.setDetails(claims.sessionId());
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (RuntimeException ex) {
                SecurityContextHolder.clearContext();
                unauthorized(response, "Phiên đăng nhập không hợp lệ hoặc đã hết hạn");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    private void unauthorized(HttpServletResponse response, String message) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
