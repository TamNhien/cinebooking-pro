package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="customer_support_case")
public class CustomerSupportCase {
    @Id private UUID id;
    @Column(name="case_number",nullable=false,unique=true,length=24) private String caseNumber;
    @Column(name="user_id",nullable=false) private UUID userId;
    @Column(name="booking_id") private UUID bookingId;
    @Column(name="cinema_id") private UUID cinemaId;
    @Column(nullable=false,length=30) private String category;
    @Column(nullable=false,length=20) private String priority;
    @Column(nullable=false,length=24) private String status;
    @Column(nullable=false,length=180) private String subject;
    @Column(nullable=false,length=3000) private String description;
    @Column(name="assigned_to") private UUID assignedTo;
    @Column(name="sla_due_at",nullable=false) private Instant slaDueAt;
    @Column(name="resolution_note",length=1500) private String resolutionNote;
    @Column(name="last_customer_message_at",nullable=false) private Instant lastCustomerMessageAt;
    @Column(name="last_staff_message_at") private Instant lastStaffMessageAt;
    @Column(name="resolved_at") private Instant resolvedAt;
    @Column(name="closed_at") private Instant closedAt;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="updated_at",nullable=false) private Instant updatedAt;

    @PrePersist void pre(){Instant now=Instant.now();if(id==null)id=UUID.randomUUID();if(priority==null)priority="MEDIUM";if(status==null)status="OPEN";if(createdAt==null)createdAt=now;if(updatedAt==null)updatedAt=now;if(lastCustomerMessageAt==null)lastCustomerMessageAt=now;}
    @PreUpdate void update(){updatedAt=Instant.now();}

    public UUID getId(){return id;} public void setId(UUID v){id=v;} public String getCaseNumber(){return caseNumber;} public void setCaseNumber(String v){caseNumber=v;}
    public UUID getUserId(){return userId;} public void setUserId(UUID v){userId=v;} public UUID getBookingId(){return bookingId;} public void setBookingId(UUID v){bookingId=v;}
    public UUID getCinemaId(){return cinemaId;} public void setCinemaId(UUID v){cinemaId=v;} public String getCategory(){return category;} public void setCategory(String v){category=v;}
    public String getPriority(){return priority;} public void setPriority(String v){priority=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public String getSubject(){return subject;} public void setSubject(String v){subject=v;} public String getDescription(){return description;} public void setDescription(String v){description=v;}
    public UUID getAssignedTo(){return assignedTo;} public void setAssignedTo(UUID v){assignedTo=v;} public Instant getSlaDueAt(){return slaDueAt;} public void setSlaDueAt(Instant v){slaDueAt=v;}
    public String getResolutionNote(){return resolutionNote;} public void setResolutionNote(String v){resolutionNote=v;} public Instant getLastCustomerMessageAt(){return lastCustomerMessageAt;} public void setLastCustomerMessageAt(Instant v){lastCustomerMessageAt=v;}
    public Instant getLastStaffMessageAt(){return lastStaffMessageAt;} public void setLastStaffMessageAt(Instant v){lastStaffMessageAt=v;} public Instant getResolvedAt(){return resolvedAt;} public void setResolvedAt(Instant v){resolvedAt=v;}
    public Instant getClosedAt(){return closedAt;} public void setClosedAt(Instant v){closedAt=v;} public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;} public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
}
