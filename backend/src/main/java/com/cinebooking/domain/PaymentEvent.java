package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="payment_event")
public class PaymentEvent {
    @Id private UUID id;
    @Column(name="payment_id",nullable=false) private UUID paymentId;
    @Column(name="event_type",nullable=false) private String eventType;
    @Column(name="actor_type",nullable=false) private String actorType;
    @Column(name="actor_ref") private String actorRef;
    @Column(name="from_status") private String fromStatus;
    @Column(name="to_status") private String toStatus;
    @Column private String code;
    @Column private String message;
    @Column(name="details_json",columnDefinition="text") private String detailsJson;
    @Column(name="created_at",nullable=false) private Instant createdAt;

    @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(createdAt==null)createdAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getPaymentId(){return paymentId;} public void setPaymentId(UUID v){paymentId=v;}
    public String getEventType(){return eventType;} public void setEventType(String v){eventType=v;}
    public String getActorType(){return actorType;} public void setActorType(String v){actorType=v;}
    public String getActorRef(){return actorRef;} public void setActorRef(String v){actorRef=v;}
    public String getFromStatus(){return fromStatus;} public void setFromStatus(String v){fromStatus=v;}
    public String getToStatus(){return toStatus;} public void setToStatus(String v){toStatus=v;}
    public String getCode(){return code;} public void setCode(String v){code=v;}
    public String getMessage(){return message;} public void setMessage(String v){message=v;}
    public String getDetailsJson(){return detailsJson;} public void setDetailsJson(String v){detailsJson=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
}
