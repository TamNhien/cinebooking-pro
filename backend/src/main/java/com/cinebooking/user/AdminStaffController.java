package com.cinebooking.user;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import static com.cinebooking.user.AdminStaffDtos.*;

@RestController
@RequestMapping("/api/admin/staff")
public class AdminStaffController {
    private final AdminStaffService service;
    public AdminStaffController(AdminStaffService service) { this.service = service; }

    @GetMapping
    public List<StaffResponse> list() { return service.list(); }

    @GetMapping("/email-status")
    public EmailStatusResponse emailStatus(@RequestParam String email) { return service.emailStatus(email); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StaffResponse create(@Valid @RequestBody CreateStaffRequest req, Authentication auth) {
        return service.create(req, auth.getName());
    }

    @PostMapping("/promote")
    @ResponseStatus(HttpStatus.CREATED)
    public StaffResponse promote(@Valid @RequestBody PromoteStaffRequest req, Authentication auth) {
        return service.promote(req, auth.getName());
    }

    @PutMapping("/{userId}")
    public StaffResponse update(@PathVariable UUID userId, @Valid @RequestBody UpdateStaffRequest req, Authentication auth) {
        return service.update(userId, req, auth.getName());
    }

    @DeleteMapping("/{userId}")
    public DeleteStaffResponse delete(@PathVariable UUID userId, Authentication auth) {
        return service.delete(userId, auth.getName());
    }
}
