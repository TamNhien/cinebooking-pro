package com.cinebooking.identity;

import com.cinebooking.auth.AuthSessionService;
import com.cinebooking.common.ApiException;
import com.cinebooking.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import static com.cinebooking.identity.StepUpDtos.*;

@RestController
@RequestMapping("/api/security/step-up")
public class StepUpController {
    private final StepUpAuthenticationService service;
    private final UserRepository users;
    public StepUpController(StepUpAuthenticationService service,UserRepository users){this.service=service;this.users=users;}

    @PostMapping public StepUpGrantResponse issue(@Valid @RequestBody StepUpRequest body,Authentication auth,HttpServletRequest request){
        return service.issue(auth.getName(),sessionId(auth),body.password(),ip(request));
    }
    @GetMapping("/status") public StepUpStatusResponse status(@RequestHeader(value="X-Step-Up-Token",required=false) String token,Authentication auth){
        UUID userId=users.findByEmailIgnoreCase(auth.getName()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản")).getId();
        return service.status(userId,sessionId(auth),token);
    }
    @DeleteMapping @ResponseStatus(HttpStatus.NO_CONTENT) public void revoke(@RequestHeader(value="X-Step-Up-Token",required=false) String token,Authentication auth,HttpServletRequest request){
        UUID userId=users.findByEmailIgnoreCase(auth.getName()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy tài khoản")).getId();
        service.revokeCurrent(userId,sessionId(auth),token,auth.getName(),ip(request));
    }
    private UUID sessionId(Authentication auth){return auth!=null&&auth.getDetails() instanceof UUID u?u:null;}
    private String ip(HttpServletRequest r){return AuthSessionService.ip(r);}
}
