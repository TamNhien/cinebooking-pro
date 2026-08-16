package com.cinebooking.user;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import static com.cinebooking.user.UserDtos.*;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {
    private final UserService service;
    public AdminUserController(UserService service){this.service=service;}
    @GetMapping public List<UserResponse> list(){return service.adminList();}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public UserResponse create(@Valid @RequestBody AdminCreateUserRequest req){return service.adminCreate(req);}
    @PutMapping("/{id}") public UserResponse update(@PathVariable UUID id,@Valid @RequestBody AdminUpdateUserRequest req, Authentication auth){return service.adminUpdate(id,req,auth.getName());}
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable UUID id,Authentication auth){service.adminDelete(id,auth.getName());}
}
