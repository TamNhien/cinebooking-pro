package com.cinebooking.auth;

import com.cinebooking.common.PasswordPolicy;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public final class PasswordResetDtos {
    private PasswordResetDtos() {}

    public record ForgotPasswordRequest(@NotBlank @Email String email) {}
    public record ForgotPasswordResponse(String message, String devResetUrl) {}
    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE) String newPassword
    ) {}
}
