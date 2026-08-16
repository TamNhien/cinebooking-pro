package com.cinebooking.user;

import com.cinebooking.common.PasswordPolicy;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class AdminStaffDtos {
    private AdminStaffDtos() {}

    public record StaffResponse(
            UUID userId,
            String employeeCode,
            String email,
            String fullName,
            String phone,
            String role,
            UUID cinemaId,
            String cinemaName,
            String jobTitle,
            String employmentStatus,
            LocalDate hireDate,
            boolean accountEnabled,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record DeleteStaffResponse(
            UUID userId,
            String employeeCode,
            int cancelledShifts,
            boolean endedActiveShift,
            String message
    ) {}

    public record EmailStatusResponse(
            boolean exists,
            UUID userId,
            String role,
            String fullName,
            String phone,
            boolean activeStaff,
            boolean deletedStaff,
            boolean canPromote,
            String message
    ) {}

    public record CreateStaffRequest(
            @NotBlank @Size(max = 30) String employeeCode,
            @NotBlank @Email String email,
            @NotBlank @Pattern(regexp = PasswordPolicy.REGEX, message = PasswordPolicy.MESSAGE) String password,
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 30) String phone,
            @NotBlank String role,
            UUID cinemaId,
            @Size(max = 100) String jobTitle,
            @NotBlank String employmentStatus,
            LocalDate hireDate,
            boolean accountEnabled
    ) {}

    public record PromoteStaffRequest(
            @NotBlank @Size(max = 30) String employeeCode,
            @NotBlank @Email String email,
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 30) String phone,
            @NotBlank String role,
            UUID cinemaId,
            @Size(max = 100) String jobTitle,
            @NotBlank String employmentStatus,
            LocalDate hireDate,
            boolean accountEnabled
    ) {}

    public record UpdateStaffRequest(
            @NotBlank @Size(max = 30) String employeeCode,
            @NotBlank @Email String email,
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 30) String phone,
            @NotBlank String role,
            UUID cinemaId,
            @Size(max = 100) String jobTitle,
            @NotBlank String employmentStatus,
            LocalDate hireDate,
            boolean accountEnabled,
            String newPassword
    ) {}
}
