package com.cinebooking.notification;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class NotificationDtos {
    private NotificationDtos(){}
    public record NotificationResponse(UUID id,String type,String category,String priority,String title,String message,String linkUrl,boolean read,Instant readAt,boolean archived,Instant archivedAt,String emailStatus,Instant createdAt){}
    public record NotificationSummary(long unreadCount,long highPriorityUnreadCount,long archivedCount){}
    public record PreferenceResponse(boolean inAppEnabled,boolean emailEnabled,boolean browserEnabled,boolean bookingEnabled,boolean reminderEnabled,boolean refundEnabled,boolean staffShiftEnabled,boolean promotionEnabled,boolean loyaltyEnabled,boolean waitlistEnabled,Instant updatedAt){}
    public record PreferenceUpdate(@NotNull Boolean inAppEnabled,@NotNull Boolean emailEnabled,@NotNull Boolean browserEnabled,@NotNull Boolean bookingEnabled,@NotNull Boolean reminderEnabled,@NotNull Boolean refundEnabled,@NotNull Boolean staffShiftEnabled,@NotNull Boolean promotionEnabled,Boolean loyaltyEnabled,Boolean waitlistEnabled){}
}
