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
    private final StringRedisTemplate redis; private final int maxAttempts; private final int ipMaxAttempts; private final long lockSeconds;
    public LoginRateLimitService(StringRedisTemplate redis,@Value("${app.security.login-max-attempts:5}") int maxAttempts,@Value("${app.security.login-ip-max-attempts:20}") int ipMaxAttempts,@Value("${app.security.login-lock-seconds:900}") long lockSeconds){this.redis=redis;this.maxAttempts=maxAttempts;this.ipMaxAttempts=ipMaxAttempts;this.lockSeconds=lockSeconds;}
    private String emailKey(String email){return "auth:login:fail:email:"+email.trim().toLowerCase(Locale.ROOT);}
    private String ipKey(String ip){return "auth:login:fail:ip:"+(ip==null||ip.isBlank()?"unknown":ip.trim());}
    public void assertAllowed(String email,String ip){if(count(emailKey(email))>=maxAttempts||count(ipKey(ip))>=ipMaxAttempts)throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,"Đăng nhập tạm thời bị giới hạn do có quá nhiều lần thử sai. Vui lòng thử lại sau.");}
    public boolean failed(String email,String ip){long byEmail=increment(emailKey(email));long byIp=increment(ipKey(ip));return byEmail>=maxAttempts||byIp>=ipMaxAttempts;}
    public void success(String email,String ip){redis.delete(emailKey(email));}
    public void assertAllowed(String email){assertAllowed(email,null);}
    public void failed(String email){failed(email,null);}
    public void success(String email){success(email,null);}
    private long count(String key){String v=redis.opsForValue().get(key);if(v==null)return 0;try{return Long.parseLong(v);}catch(NumberFormatException e){return 0;}}
    private long increment(String key){Long v=redis.opsForValue().increment(key);if(v!=null&&v==1)redis.expire(key,Duration.ofSeconds(lockSeconds));return v==null?0:v;}
}
