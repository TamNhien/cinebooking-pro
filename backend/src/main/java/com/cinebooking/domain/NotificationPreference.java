package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notification_preference")
public class NotificationPreference {
    @Id @Column(name="user_id") private UUID userId;
    @Column(name="in_app_enabled",nullable=false) private Boolean inAppEnabled;
    @Column(name="email_enabled",nullable=false) private Boolean emailEnabled;
    @Column(name="browser_enabled",nullable=false) private Boolean browserEnabled;
    @Column(name="booking_enabled",nullable=false) private Boolean bookingEnabled;
    @Column(name="reminder_enabled",nullable=false) private Boolean reminderEnabled;
    @Column(name="refund_enabled",nullable=false) private Boolean refundEnabled;
    @Column(name="staff_shift_enabled",nullable=false) private Boolean staffShiftEnabled;
    @Column(name="promotion_enabled",nullable=false) private Boolean promotionEnabled;
    @Column(name="loyalty_enabled",nullable=false) private Boolean loyaltyEnabled;
    @Column(name="waitlist_enabled",nullable=false) private Boolean waitlistEnabled;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;

    @PrePersist void pre(){
        if(inAppEnabled==null)inAppEnabled=true;
        if(emailEnabled==null)emailEnabled=false;
        if(browserEnabled==null)browserEnabled=false;
        if(bookingEnabled==null)bookingEnabled=true;
        if(reminderEnabled==null)reminderEnabled=true;
        if(refundEnabled==null)refundEnabled=true;
        if(staffShiftEnabled==null)staffShiftEnabled=true;
        if(promotionEnabled==null)promotionEnabled=true;
        if(loyaltyEnabled==null)loyaltyEnabled=true;
        if(waitlistEnabled==null)waitlistEnabled=true;
        if(updatedAt==null)updatedAt=Instant.now();
    }
    @PreUpdate void update(){updatedAt=Instant.now();}

    public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;}
    public Boolean getInAppEnabled(){return inAppEnabled;} public void setInAppEnabled(Boolean v){inAppEnabled=v;}
    public Boolean getEmailEnabled(){return emailEnabled;} public void setEmailEnabled(Boolean v){emailEnabled=v;}
    public Boolean getBrowserEnabled(){return browserEnabled;} public void setBrowserEnabled(Boolean v){browserEnabled=v;}
    public Boolean getBookingEnabled(){return bookingEnabled;} public void setBookingEnabled(Boolean v){bookingEnabled=v;}
    public Boolean getReminderEnabled(){return reminderEnabled;} public void setReminderEnabled(Boolean v){reminderEnabled=v;}
    public Boolean getRefundEnabled(){return refundEnabled;} public void setRefundEnabled(Boolean v){refundEnabled=v;}
    public Boolean getStaffShiftEnabled(){return staffShiftEnabled;} public void setStaffShiftEnabled(Boolean v){staffShiftEnabled=v;}
    public Boolean getPromotionEnabled(){return promotionEnabled;} public void setPromotionEnabled(Boolean v){promotionEnabled=v;}
    public Boolean getLoyaltyEnabled(){return loyaltyEnabled;} public void setLoyaltyEnabled(Boolean v){loyaltyEnabled=v;}
    public Boolean getWaitlistEnabled(){return waitlistEnabled;} public void setWaitlistEnabled(Boolean v){waitlistEnabled=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
