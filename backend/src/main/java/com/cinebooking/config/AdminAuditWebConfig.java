package com.cinebooking.config;
import com.cinebooking.audit.AdminAuditInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
@Configuration
public class AdminAuditWebConfig implements WebMvcConfigurer {
    private final AdminAuditInterceptor interceptor; public AdminAuditWebConfig(AdminAuditInterceptor interceptor){this.interceptor=interceptor;}
    @Override public void addInterceptors(InterceptorRegistry registry){registry.addInterceptor(interceptor).addPathPatterns("/api/admin/**");}
}
