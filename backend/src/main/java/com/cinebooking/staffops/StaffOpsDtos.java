package com.cinebooking.staffops;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.*;
import java.util.*;

public final class StaffOpsDtos {
    private StaffOpsDtos(){}
    public record ShiftRequest(@NotNull UUID staffUserId,@NotNull LocalDate shiftDate,@NotNull LocalTime startTime,@NotNull LocalTime endTime,@Size(max=300) String note){}
    public record ShiftResponse(UUID id,UUID staffUserId,String employeeCode,String staffName,UUID cinemaId,String cinemaName,LocalDate shiftDate,LocalTime startTime,LocalTime endTime,String status,String note,Instant checkInAt,Instant checkOutAt,long checkedTickets,Integer lateMinutes,Integer earlyLeaveMinutes,Integer workedMinutes,String punctualityStatus){}
    public record AttendanceResponse(UUID id,UUID shiftId,UUID staffUserId,UUID cinemaId,String cinemaName,Instant checkInAt,Instant checkOutAt,String status,int lateMinutes,int earlyLeaveMinutes,Integer workedMinutes,String punctualityStatus){}
    public record GateStatus(boolean canScan,String message,AttendanceResponse attendance){}
    public record StaffOption(UUID userId,String employeeCode,String fullName,String role,UUID cinemaId,String cinemaName){}
    public record CinemaOption(UUID id,String name){}

    public record LeaveCreateRequest(@NotNull LocalDate fromDate,@NotNull LocalDate toDate,@NotBlank @Size(max=20) String leaveType,@NotBlank @Size(max=500) String reason){}
    public record LeaveReviewRequest(@NotBlank @Size(max=20) String decision,@Size(max=500) String note){}
    public record LeaveResponse(UUID id,UUID staffUserId,String employeeCode,String staffName,UUID cinemaId,String cinemaName,LocalDate fromDate,LocalDate toDate,String leaveType,String reason,String status,String reviewedByEmail,Instant reviewedAt,String reviewNote,Instant createdAt){}
    public record TimesheetRow(UUID staffUserId,String employeeCode,String staffName,UUID cinemaId,String cinemaName,int scheduledShifts,int completedShifts,int absentShifts,long scheduledMinutes,long workedMinutes,long lateMinutes,long earlyLeaveMinutes,long approvedLeaveDays){}
    public record TimesheetReport(YearMonth month,UUID cinemaId,String cinemaName,List<TimesheetRow> rows,long totalScheduledMinutes,long totalWorkedMinutes,long totalLateMinutes,long totalEarlyLeaveMinutes,int totalAbsentShifts){}
    public record OperationsCinemaOption(UUID id,String name){}
    public record OperationsStaffOption(UUID userId,String employeeCode,String fullName,String role){}
    public record LiveCheckIn(UUID bookingId,String movieTitle,String cinemaName,String auditoriumName,Instant checkedInAt,String source,String staffName){}
    public record OperationsLiveSnapshot(UUID cinemaId,String cinemaName,long checkedInLast5Minutes,long checkedInLastHour,long checkedInToday,long activeStaff,long openIncidents,Instant generatedAt,List<LiveCheckIn> recentCheckIns){}

    public record HandoverCreateRequest(@NotNull UUID toStaffUserId,@NotBlank @Size(max=1000) String summary){}
    public record HandoverResponse(UUID id,UUID cinemaId,String cinemaName,UUID fromShiftId,UUID fromAttendanceId,UUID fromStaffUserId,String fromStaffName,UUID toStaffUserId,String toStaffName,String summary,String status,Instant createdAt,Instant acceptedAt){}

    public record IncidentCreateRequest(UUID cinemaId,@NotBlank @Size(max=30) String category,@NotBlank @Size(max=20) String severity,@NotBlank @Size(max=160) String title,@NotBlank @Size(max=2000) String description){}
    public record IncidentResolveRequest(@NotBlank @Size(max=1000) String resolutionNote){}
    public record IncidentResponse(UUID id,UUID cinemaId,String cinemaName,UUID shiftId,UUID attendanceId,UUID reportedBy,String reportedByName,String category,String severity,String title,String description,String status,UUID resolvedBy,String resolvedByName,Instant resolvedAt,String resolutionNote,Instant createdAt,Instant updatedAt){}

}
