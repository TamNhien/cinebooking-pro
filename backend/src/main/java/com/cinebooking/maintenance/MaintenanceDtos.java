package com.cinebooking.maintenance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.*;
import java.util.UUID;

public final class MaintenanceDtos {
    private MaintenanceDtos(){}

    public record CinemaOption(UUID id,String name){}
    public record AuditoriumOption(UUID id,UUID cinemaId,String name){}
    public record StaffOption(UUID userId,String employeeCode,String fullName,String role){}
    public record IncidentOption(UUID id,String severity,String category,String title,String reportedByName,Instant createdAt){}

    public record MaintenanceSummary(UUID cinemaId,String cinemaName,long totalAssets,long degradedAssets,long outOfServiceAssets,long maintenanceAssets,long openWorkOrders,long criticalOpenWorkOrders,long overdueWorkOrders,long serviceDueNext14Days,Instant generatedAt){}

    public record AssetRequest(
            @NotNull UUID cinemaId,
            UUID auditoriumId,
            @NotBlank @Size(max=40) String assetCode,
            @NotBlank @Size(max=160) String name,
            @NotBlank @Size(max=30) String category,
            @NotBlank @Size(max=24) String status,
            @Size(max=120) String vendor,
            @Size(max=120) String serialNumber,
            LocalDate installedOn,
            Instant lastServiceAt,
            LocalDate nextServiceDue,
            @Size(max=1000) String note){}

    public record AssetResponse(UUID id,UUID cinemaId,String cinemaName,UUID auditoriumId,String auditoriumName,String assetCode,String name,String category,String status,String vendor,String serialNumber,LocalDate installedOn,Instant lastServiceAt,LocalDate nextServiceDue,String note,Instant createdAt,Instant updatedAt){}

    public record WorkOrderCreateRequest(
            @NotNull UUID cinemaId,
            UUID auditoriumId,
            UUID assetId,
            UUID sourceIncidentId,
            @NotBlank @Size(max=160) String title,
            @NotBlank @Size(max=2000) String description,
            @NotBlank @Size(max=20) String priority,
            UUID assignedTo,
            Instant dueAt){}

    public record WorkOrderPlanRequest(
            @NotBlank @Size(max=20) String priority,
            UUID assignedTo,
            Instant dueAt,
            @Size(max=1200) String note){}

    public record WorkOrderTransitionRequest(
            @NotBlank @Size(max=24) String targetStatus,
            @Size(max=1200) String note){}

    public record WorkOrderResponse(UUID id,UUID cinemaId,String cinemaName,UUID auditoriumId,String auditoriumName,UUID assetId,String assetCode,String assetName,UUID sourceIncidentId,String title,String description,String priority,String status,UUID assignedTo,String assignedToName,Instant dueAt,boolean overdue,String resolutionNote,UUID createdBy,String createdByName,Instant startedAt,Instant resolvedAt,UUID resolvedBy,String resolvedByName,Instant createdAt,Instant updatedAt){}

    public record WorkOrderEventResponse(UUID id,UUID workOrderId,String eventType,String fromStatus,String toStatus,String note,UUID actorUserId,String actorName,Instant createdAt){}
}
