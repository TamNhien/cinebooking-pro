package com.cinebooking.config;

import com.cinebooking.auth.JwtAuthenticationFilter;
import com.cinebooking.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;

import java.nio.charset.StandardCharsets;
import java.util.List;

@Configuration
public class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new ModernPasswordEncoder(); }

    @Bean UserDetailsService userDetailsService(UserRepository users) {
        return username -> users.findByEmailIgnoreCase(username)
                .map(u -> User.withUsername(u.getEmail()).password(u.getPasswordHash()).roles(u.getRole().name()).disabled(!u.isAccountEnabled()).build())
                .orElseThrow(() -> new org.springframework.security.core.userdetails.UsernameNotFoundException("User not found"));
    }

    @Bean CorsConfigurationSource cors(@Value("${app.frontend-url}") String frontendUrl) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(List.of(frontendUrl, "http://localhost", "http://localhost:3000"));
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key", "X-CineBooking-Browser"));
        c.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", c);
        return source;
    }

    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http, JwtAuthenticationFilter jwt) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> {})
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpStatus.UNAUTHORIZED.value());
                    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.getWriter().write("{\"message\":\"Phiên đăng nhập không hợp lệ hoặc đã hết hạn\"}");
                })
                .accessDeniedHandler((request, response, denied) -> {
                    response.setStatus(HttpStatus.FORBIDDEN.value());
                    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.getWriter().write("{\"message\":\"Bạn không có quyền thực hiện thao tác này\"}");
                }))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health/**", "/ws/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/uploads/**").permitAll()
                .requestMatchers("/api/auth/**", "/api/payments/vnpay/**", "/api/payments/momo/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/recommendations/profile").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/movies/**", "/api/showtimes/**", "/api/cinemas/**", "/api/recommendations/**", "/api/commerce/products", "/api/commerce/vouchers").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/commerce/vouchers/quote").permitAll()
                .requestMatchers("/api/staff/**").hasAnyRole("STAFF","MANAGER","ADMIN")
                .requestMatchers("/api/admin/shifts/**").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers("/api/admin/attendance/**").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers("/api/admin/analytics/**").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers("/api/admin/command-center/**").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers("/api/admin/maintenance/**").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers("/api/admin/support/**").hasAnyRole("MANAGER","ADMIN")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .addFilterBefore(jwt, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
