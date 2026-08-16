package com.cinebooking.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import static com.cinebooking.auth.PasswordResetDtos.*;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth; private final PasswordResetService passwordReset; private final AuthSessionService sessions;
    public AuthController(AuthService auth,PasswordResetService passwordReset,AuthSessionService sessions){this.auth=auth;this.passwordReset=passwordReset;this.sessions=sessions;}
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED) public AuthResponse register(@Valid @RequestBody RegisterRequest req,HttpServletRequest request,HttpServletResponse response){return auth.register(req,request,response);}
    @PostMapping("/login") public AuthResponse login(@Valid @RequestBody LoginRequest req,HttpServletRequest request,HttpServletResponse response){return auth.login(req,request,response);}
    @PostMapping("/refresh") public AuthResponse refresh(HttpServletRequest request,HttpServletResponse response){return sessions.refresh(request,response);}
    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT) public void logout(@RequestHeader(value="Authorization",required=false) String authorization,HttpServletRequest request,HttpServletResponse response){sessions.logout(sessions.sessionIdFromAuthorization(authorization),request,response,null);}
    @PostMapping("/forgot-password") public ForgotPasswordResponse forgot(@Valid @RequestBody ForgotPasswordRequest req){return passwordReset.forgot(req);}
    @PostMapping("/reset-password") @ResponseStatus(HttpStatus.NO_CONTENT) public void reset(@Valid @RequestBody ResetPasswordRequest req){passwordReset.reset(req);}
}
