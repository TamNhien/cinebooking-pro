package com.cinebooking.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="financial_reconciliation_issue")
public class FinancialReconciliationIssue {
    @Id private UUID id;
    @Column(name="run_id",nullable=false) private UUID runId;
    @Column(name="issue_type",nullable=false,length=50) private String issueType;
    @Column(nullable=false,length=10) private String severity;
    @Column(name="entity_type",nullable=false,length=30) private String entityType;
    @Column(name="entity_id",length=100) private String entityId;
    @Column(name="expected_value",precision=14,scale=2) private BigDecimal expectedValue;
    @Column(name="actual_value",precision=14,scale=2) private BigDecimal actualValue;
    @Column(nullable=false,columnDefinition="text") private String message;
    @Column(nullable=false,length=12) private String status;
    @Column(name="created_at",nullable=false) private Instant createdAt;
    @Column(name="resolved_at") private Instant resolvedAt;
    @Column(name="resolved_by",length=190) private String resolvedBy;

    @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(status==null)status="OPEN";if(createdAt==null)createdAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getRunId(){return runId;} public void setRunId(UUID v){runId=v;}
    public String getIssueType(){return issueType;} public void setIssueType(String v){issueType=v;}
    public String getSeverity(){return severity;} public void setSeverity(String v){severity=v;}
    public String getEntityType(){return entityType;} public void setEntityType(String v){entityType=v;}
    public String getEntityId(){return entityId;} public void setEntityId(String v){entityId=v;}
    public BigDecimal getExpectedValue(){return expectedValue;} public void setExpectedValue(BigDecimal v){expectedValue=v;}
    public BigDecimal getActualValue(){return actualValue;} public void setActualValue(BigDecimal v){actualValue=v;}
    public String getMessage(){return message;} public void setMessage(String v){message=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Instant getResolvedAt(){return resolvedAt;} public void setResolvedAt(Instant v){resolvedAt=v;}
    public String getResolvedBy(){return resolvedBy;} public void setResolvedBy(String v){resolvedBy=v;}
}
