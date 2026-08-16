package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="user_notification")
public class UserNotification {
    @Id private UUID id;
    @Column(name="user_id",nullable=false) private UUID userId;
    @Column(name="notification_type",nullable=false) private String notificationType;
    @Column(nullable=false) private String title;
    @Column(nullable=false) private String message;
    @Column(name="link_url") private String linkUrl;
    @Column(name="is_read",nullable=false) private Boolean read;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(nullable=false,length=30) private String category;
    @Column(name="in_app_visible",nullable=false) private Boolean inAppVisible;
    @Column(name="email_status",nullable=false,length=20) private String emailStatus;
    @Column(name="email_sent_at") private Instant emailSentAt;
    @Column(name="delivery_error",length=300) private String deliveryError;
    @Column(name="dedupe_key",length=180) private String dedupeKey;

    @PrePersist void pre(){
        if(id==null)id=UUID.randomUUID();
        if(read==null)read=false;
        if(createdAt==null)createdAt=Instant.now();
        if(category==null)category="GENERAL";
        if(inAppVisible==null)inAppVisible=true;
        if(emailStatus==null)emailStatus="SKIPPED";
    }
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;}
    public String getNotificationType(){return notificationType;} public void setNotificationType(String v){notificationType=v;}
    public String getTitle(){return title;} public void setTitle(String v){title=v;}
    public String getMessage(){return message;} public void setMessage(String v){message=v;}
    public String getLinkUrl(){return linkUrl;} public void setLinkUrl(String v){linkUrl=v;}
    public Boolean getRead(){return read;} public void setRead(Boolean v){read=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public String getCategory(){return category;} public void setCategory(String v){category=v;}
    public Boolean getInAppVisible(){return inAppVisible;} public void setInAppVisible(Boolean v){inAppVisible=v;}
    public String getEmailStatus(){return emailStatus;} public void setEmailStatus(String v){emailStatus=v;}
    public Instant getEmailSentAt(){return emailSentAt;} public void setEmailSentAt(Instant v){emailSentAt=v;}
    public String getDeliveryError(){return deliveryError;} public void setDeliveryError(String v){deliveryError=v;}
    public String getDedupeKey(){return dedupeKey;} public void setDedupeKey(String v){dedupeKey=v;}
}
