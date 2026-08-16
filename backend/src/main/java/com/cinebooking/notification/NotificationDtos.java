package com.cinebooking.notification;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.UUID;

public final class NotificationDtos {
    private NotificationDtos(){}
    public record NotificationResponse(UUID id,String type,String category,String title,String message,String linkUrl,boolean read,String emailStatus,Instant createdAt){}
    public record NotificationSummary(long unreadCount){}
    public record PreferenceResponse(boolean inAppEnabled,boolean emailEnabled,boolean browserEnabled,boolean bookingEnabled,boolean reminderEnabled,boolean refundEnabled,boolean staffShiftEnabled,boolean promotionEnabled,Instant updatedAt){}
    public record PreferenceUpdate(@NotNull Boolean inAppEnabled,@NotNull Boolean emailEnabled,@NotNull Boolean browserEnabled,@NotNull Boolean bookingEnabled,@NotNull Boolean reminderEnabled,@NotNull Boolean refundEnabled,@NotNull Boolean staffShiftEnabled,@NotNull Boolean promotionEnabled){}
}
