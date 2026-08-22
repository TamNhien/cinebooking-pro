package com.cinebooking.auth;

import com.cinebooking.common.ApiException;
import com.cinebooking.security.SecurityProtectionService;
import com.cinebooking.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import static com.cinebooking.auth.SecurityDtos.*;
import static com.cinebooking.security.SecurityProtectionDtos.*;

@RestController
@RequestMapping("/api/admin/security")
public class AdminSecurityController {
    private final AuthSessionService sessions; private final UserRepository users; private final SecurityProtectionService protection;
    public AdminSecurityController(AuthSessionService sessions,UserRepository users,SecurityProtectionService protection){this.sessions=sessions;this.users=users;this.protection=protection;}
    @GetMapping("/overview") public AdminSecuritySummary overview(){return protection.adminSummary();}
    @GetMapping("/alerts") public List<AdminSecurityAlertView> alerts(){return protection.adminAlerts();}
    @GetMapping("/users/{userId}/sessions") public List<SessionView> list(@PathVariable UUID userId){if(!users.existsById(userId))throw new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy người dùng");return sessions.adminSessions(userId);}
    @DeleteMapping("/users/{userId}/sessions") public Map<String,Object> revokeAll(@PathVariable UUID userId, Authentication auth){if(!users.existsById(userId))throw new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy người dùng");int count=sessions.revokeAllForUser(userId,"ADMIN_REVOKED",auth.getName());return Map.of("revoked",count);}
}
