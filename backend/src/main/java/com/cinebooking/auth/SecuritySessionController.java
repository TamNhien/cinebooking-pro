package com.cinebooking.auth;

import com.cinebooking.common.ApiException;
import com.cinebooking.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import static com.cinebooking.auth.SecurityDtos.*;

@RestController
@RequestMapping("/api/me/security")
public class SecuritySessionController {
    private final AuthSessionService sessions; private final UserRepository users;
    public SecuritySessionController(AuthSessionService sessions,UserRepository users){this.sessions=sessions;this.users=users;}

    @GetMapping("/sessions") public List<SessionView> list(Authentication auth){var u=user(auth);return sessions.mySessions(u.getId(),current(auth));}
    @GetMapping("/events") public List<LoginEventView> events(Authentication auth){return sessions.loginEvents(auth.getName());}
    @DeleteMapping("/sessions/{id}") public Map<String,Object> revoke(@PathVariable UUID id,Authentication auth){var u=user(auth);sessions.revokeOwn(u.getId(),id,current(auth),auth.getName());return Map.of("revoked",true,"current",id.equals(current(auth)));}
    @DeleteMapping("/sessions") public Map<String,Object> revokeOthers(Authentication auth){var u=user(auth);int count=sessions.revokeOthers(u.getId(),current(auth),auth.getName());return Map.of("revoked",count);}

    private com.cinebooking.domain.AppUser user(Authentication auth){return users.findByEmailIgnoreCase(auth.getName()).orElseThrow(()->new ApiException(HttpStatus.UNAUTHORIZED,"Không tìm thấy tài khoản"));}
    private UUID current(Authentication auth){return auth.getDetails() instanceof UUID u?u:null;}
}
