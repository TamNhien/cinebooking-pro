package com.cinebooking.user;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import static com.cinebooking.user.UserDtos.*;

@RestController
@RequestMapping("/api/me")
public class ProfileController {
    private final UserService service;
    public ProfileController(UserService service){this.service=service;}
    @GetMapping public UserResponse me(Authentication auth){return service.me(auth.getName());}
    @PutMapping public UserResponse update(@Valid @RequestBody UpdateProfileRequest req, Authentication auth){return service.updateMe(auth.getName(),req);}
    @PutMapping("/password") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void password(@Valid @RequestBody ChangePasswordRequest req, Authentication auth){service.changePassword(auth.getName(),req, auth.getDetails() instanceof java.util.UUID u ? u : null);}
}
