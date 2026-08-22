package com.cinebooking.support;

import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.UUID;

public final class SupportDtos {
    private SupportDtos(){}
    public record SupportCinema(UUID id,String name){}
    public record SupportStaff(UUID userId,String employeeCode,String fullName,String role){}
    public record SupportSummary(UUID cinemaId,String cinemaName,long activeCases,long waitingCustomer,long criticalActive,long overdueSla,Instant generatedAt){}
    public record CreateCaseRequest(UUID bookingId,@NotBlank @Size(max=30) String category,@NotBlank @Size(max=180) String subject,@NotBlank @Size(max=3000) String description){}
    public record CustomerMessageRequest(@NotBlank @Size(max=3000) String message){}
    public record CasePlanRequest(@NotBlank @Size(max=20) String priority,UUID assignedTo){}
    public record StaffReplyRequest(@NotBlank @Size(max=3000) String message,boolean internal){}
    public record CaseTransitionRequest(@NotBlank @Size(max=24) String targetStatus,@Size(max=1500) String note){}
    public record CaseResponse(UUID id,String caseNumber,UUID userId,String customerName,String customerEmail,UUID bookingId,UUID cinemaId,String cinemaName,String category,String priority,String status,String subject,String description,UUID assignedTo,String assignedToName,Instant slaDueAt,boolean overdue,String resolutionNote,Instant lastCustomerMessageAt,Instant lastStaffMessageAt,Instant resolvedAt,Instant closedAt,Instant createdAt,Instant updatedAt){}
    public record CaseEventResponse(UUID id,UUID caseId,String eventType,String fromStatus,String toStatus,String visibility,String message,UUID actorUserId,String actorName,String actorRole,Instant createdAt){}
}
