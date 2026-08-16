package com.cinebooking.config;

import com.cinebooking.domain.AppUser;
import com.cinebooking.domain.Role;
import com.cinebooking.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AdminBootstrap implements CommandLineRunner {
    private final UserRepository users; private final PasswordEncoder encoder;
    @Value("${app.admin.email}") private String email;
    @Value("${app.admin.password}") private String password;
    @Value("${app.admin.name}") private String name;
    public AdminBootstrap(UserRepository users, PasswordEncoder encoder){this.users=users;this.encoder=encoder;}
    @Override @Transactional public void run(String... args) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) return;
        if (users.findByEmailIgnoreCase(email).isEmpty()) {
            AppUser u = new AppUser(); u.setEmail(email.toLowerCase()); u.setFullName(name); u.setPasswordHash(encoder.encode(password)); u.setRole(Role.ADMIN); users.save(u);
        }
    }
}
