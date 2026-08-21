package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="financial_ledger_entry")
public class FinancialLedgerEntry {
    @Id private UUID id;
    @Column(name="event_key",nullable=false,unique=true,length=180) private String eventKey;
    @Column(name="event_type",nullable=false,length=40) private String eventType;
    @Column(name="booking_id") private UUID bookingId;
    @Column(name="payment_id") private UUID paymentId;
    @Column(name="user_id") private UUID userId;
    @Column(nullable=false,length=30) private String source;
    @Column(columnDefinition="text") private String description;
    @Column(name="occurred_at",nullable=false) private Instant occurredAt;
    @Column(name="created_at",nullable=false) private Instant createdAt;

    @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(source==null||source.isBlank())source="CINEBOOKING";if(occurredAt==null)occurredAt=Instant.now();if(createdAt==null)createdAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public String getEventKey(){return eventKey;} public void setEventKey(String v){eventKey=v;}
    public String getEventType(){return eventType;} public void setEventType(String v){eventType=v;}
    public UUID getBookingId(){return bookingId;} public void setBookingId(UUID v){bookingId=v;}
    public UUID getPaymentId(){return paymentId;} public void setPaymentId(UUID v){paymentId=v;}
    public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;}
    public String getSource(){return source;} public void setSource(String v){source=v;}
    public String getDescription(){return description;} public void setDescription(String v){description=v;}
    public Instant getOccurredAt(){return occurredAt;} public void setOccurredAt(Instant v){occurredAt=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
}
