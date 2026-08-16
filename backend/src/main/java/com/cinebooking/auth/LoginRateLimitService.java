package com.cinebooking.auth;

import com.cinebooking.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import java.time.Duration;
import java.util.Locale;

@Service
public class LoginRateLimitService {
    private final StringRedisTemplate redis; private final int maxAttempts; private final long lockSeconds;
    public LoginRateLimitService(StringRedisTemplate redis,@Value("${app.security.login-max-attempts:5}") int maxAttempts,@Value("${app.security.login-lock-seconds:900}") long lockSeconds){this.redis=redis;this.maxAttempts=maxAttempts;this.lockSeconds=lockSeconds;}
    private String key(String email){return "auth:login:fail:"+email.trim().toLowerCase(Locale.ROOT);}
    public void assertAllowed(String email){String v=redis.opsForValue().get(key(email));if(v!=null&&Integer.parseInt(v)>=maxAttempts)throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,"Tài khoản tạm khóa đăng nhập do sai mật khẩu nhiều lần. Vui lòng thử lại sau.");}
    public void failed(String email){String k=key(email);Long v=redis.opsForValue().increment(k);if(v!=null&&v==1)redis.expire(k, Duration.ofSeconds(lockSeconds));}
    public void success(String email){redis.delete(key(email));}
}
