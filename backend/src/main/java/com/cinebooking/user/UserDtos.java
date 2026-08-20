package com.cinebooking.user;

import com.cinebooking.common.PasswordPolicy;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class UserDtos {
    private UserDtos() {}

    public record UserResponse(UUID id, String email, String fullName, String phone, String role, int loyaltyPoints, int loyaltyLifetimePoints, String membershipTier, LocalDate birthDate, boolean accountEnabled, Instant createdAt, Instant updatedAt) {}
    public record UpdateProfileRequest(@NotBlank @Size(max = 120) String fullName, @Size(max = 30) String phone, LocalDate birthDate) {}
    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE) String newPassword
    ) {}
    public record AdminCreateUserRequest(
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE) String password,
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 30) String phone,
            @NotBlank String role
    ) {}
    public record AdminUpdateUserRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 30) String phone,
            @NotBlank String role,
            String newPassword
    ) {}
}
