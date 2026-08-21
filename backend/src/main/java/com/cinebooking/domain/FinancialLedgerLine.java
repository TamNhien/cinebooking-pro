package com.cinebooking.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="financial_ledger_line")
public class FinancialLedgerLine {
    @Id private UUID id;
    @Column(name="entry_id",nullable=false) private UUID entryId;
    @Column(name="account_code",nullable=false,length=80) private String accountCode;
    @Column(nullable=false,length=6) private String direction;
    @Column(nullable=false,precision=14,scale=2) private BigDecimal amount;
    @Column(nullable=false,length=3) private String currency;
    @Column(name="created_at",nullable=false) private Instant createdAt;

    @PrePersist void pre(){if(id==null)id=UUID.randomUUID();if(currency==null||currency.isBlank())currency="VND";if(createdAt==null)createdAt=Instant.now();}
    public UUID getId(){return id;} public void setId(UUID v){id=v;}
    public UUID getEntryId(){return entryId;} public void setEntryId(UUID v){entryId=v;}
    public String getAccountCode(){return accountCode;} public void setAccountCode(String v){accountCode=v;}
    public String getDirection(){return direction;} public void setDirection(String v){direction=v;}
    public BigDecimal getAmount(){return amount;} public void setAmount(BigDecimal v){amount=v;}
    public String getCurrency(){return currency;} public void setCurrency(String v){currency=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
}
