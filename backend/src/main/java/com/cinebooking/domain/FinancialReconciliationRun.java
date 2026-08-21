package com.cinebooking.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name="financial_reconciliation_run")
public class FinancialReconciliationRun {
    @Id private UUID id;
    @Column(name="run_key",nullable=false,unique=true,length=120) private String runKey;
    @Column(name="business_date",nullable=false) private LocalDate businessDate;
    @Column(nullable=false,length=12) private String status;
    @Column(name="payment_count",nullable=false) private Integer paymentCount;
    @Column(name="payment_amount",nullable=false,precision=14,scale=2) private BigDecimal paymentAmount;
    @Column(name="ledger_capture_amount",nullable=false,precision=14,scale=2) private BigDecimal ledgerCaptureAmount;
    @Column(name="refund_count",nullable=false) private Integer refundCount;
    @Column(name="refund_amount",nullable=false,precision=14,scale=2) private BigDecimal refundAmount;
    @Column(name="ledger_refund_amount",nullable=false,precision=14,scale=2) private BigDecimal ledgerRefundAmount;
    @Column(name="loyalty_users_checked",nullable=false) private Integer loyaltyUsersChecked;
    @Column(name="loyalty_mismatch_count",nullable=false) private Integer loyaltyMismatchCount;
    @Column(name="issue_count",nullable=false) private Integer issueCount;
    @Column(name="started_by",nullable=false,length=190) private String startedBy;
    @Column(name="started_at",nullable=false) private Instant startedAt;
    @Column(name="finished_at") private Instant finishedAt;

    @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(status==null)status="RUNNING";if(paymentCount==null)paymentCount=0;if(paymentAmount==null)paymentAmount=BigDecimal.ZERO;if(ledgerCaptureAmount==null)ledgerCaptureAmount=BigDecimal.ZERO;if(refundCount==null)refundCount=0;if(refundAmount==null)refundAmount=BigDecimal.ZERO;if(ledgerRefundAmount==null)ledgerRefundAmount=BigDecimal.ZERO;if(loyaltyUsersChecked==null)loyaltyUsersChecked=0;if(loyaltyMismatchCount==null)loyaltyMismatchCount=0;if(issueCount==null)issueCount=0;if(startedAt==null)startedAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public String getRunKey(){return runKey;} public void setRunKey(String v){runKey=v;}
    public LocalDate getBusinessDate(){return businessDate;} public void setBusinessDate(LocalDate v){businessDate=v;}
    public String getStatus(){return status;} public void setStatus(String v){status=v;}
    public Integer getPaymentCount(){return paymentCount;} public void setPaymentCount(Integer v){paymentCount=v;}
    public BigDecimal getPaymentAmount(){return paymentAmount;} public void setPaymentAmount(BigDecimal v){paymentAmount=v;}
    public BigDecimal getLedgerCaptureAmount(){return ledgerCaptureAmount;} public void setLedgerCaptureAmount(BigDecimal v){ledgerCaptureAmount=v;}
    public Integer getRefundCount(){return refundCount;} public void setRefundCount(Integer v){refundCount=v;}
    public BigDecimal getRefundAmount(){return refundAmount;} public void setRefundAmount(BigDecimal v){refundAmount=v;}
    public BigDecimal getLedgerRefundAmount(){return ledgerRefundAmount;} public void setLedgerRefundAmount(BigDecimal v){ledgerRefundAmount=v;}
    public Integer getLoyaltyUsersChecked(){return loyaltyUsersChecked;} public void setLoyaltyUsersChecked(Integer v){loyaltyUsersChecked=v;}
    public Integer getLoyaltyMismatchCount(){return loyaltyMismatchCount;} public void setLoyaltyMismatchCount(Integer v){loyaltyMismatchCount=v;}
    public Integer getIssueCount(){return issueCount;} public void setIssueCount(Integer v){issueCount=v;}
    public String getStartedBy(){return startedBy;} public void setStartedBy(String v){startedBy=v;}
    public Instant getStartedAt(){return startedAt;} public void setStartedAt(Instant v){startedAt=v;}
    public Instant getFinishedAt(){return finishedAt;} public void setFinishedAt(Instant v){finishedAt=v;}
}
