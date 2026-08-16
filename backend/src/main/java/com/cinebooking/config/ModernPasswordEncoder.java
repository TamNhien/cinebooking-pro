package com.cinebooking.config;

import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * New passwords use Argon2id. Existing BCrypt hashes remain valid and are
 * transparently upgraded to Argon2id after the next successful login.
 */
public class ModernPasswordEncoder implements PasswordEncoder {
    private final Argon2PasswordEncoder argon2 = new Argon2PasswordEncoder(16,32,1,19456,2);
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder(12);
    @Override public String encode(CharSequence rawPassword){return argon2.encode(rawPassword);}
    @Override public boolean matches(CharSequence rawPassword,String encodedPassword){if(encodedPassword==null)return false;if(encodedPassword.startsWith("$argon2"))return argon2.matches(rawPassword,encodedPassword);if(encodedPassword.startsWith("$2a$")||encodedPassword.startsWith("$2b$")||encodedPassword.startsWith("$2y$"))return bcrypt.matches(rawPassword,encodedPassword);return false;}
    @Override public boolean upgradeEncoding(String encodedPassword){return encodedPassword==null||!encodedPassword.startsWith("$argon2id$")||argon2.upgradeEncoding(encodedPassword);}
}
