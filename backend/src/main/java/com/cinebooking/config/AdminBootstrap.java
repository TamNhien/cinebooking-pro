package com.cinebooking.config;

import com.cinebooking.domain.AppUser;
import com.cinebooking.domain.Role;
import com.cinebooking.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Locale;

@Component
public class AdminBootstrap implements CommandLineRunner {
    private final UserRepository users;
    private final PasswordEncoder encoder;

    @Value("${app.admin.email}") private String email;
    @Value("${app.admin.password}") private String password;
    @Value("${app.admin.name}") private String name;

    public AdminBootstrap(UserRepository users, PasswordEncoder encoder) {
        this.users = users;
        this.encoder = encoder;
    }

    @Override
    public void run(String... args) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) return;

        String normalizedEmail = email.trim().toLowerCase(Locale.ROOT);
        if (users.findByEmailIgnoreCase(normalizedEmail).isPresent()) return;

        AppUser admin = new AppUser();
        admin.setEmail(normalizedEmail);
        admin.setFullName(name);
        admin.setPasswordHash(encoder.encode(password));
        admin.setRole(Role.ADMIN);

        try {
            // Two backend replicas may bootstrap at the same time. saveAndFlush makes the
            // unique-email race surface inside this call instead of failing application startup.
            users.saveAndFlush(admin);
        } catch (DataIntegrityViolationException ex) {
            // If the peer replica won the race, the desired admin already exists and startup
            // is successful. Re-throw any unrelated integrity failure instead of hiding it.
            if (users.findByEmailIgnoreCase(normalizedEmail).isEmpty()) throw ex;
        }
    }
}
