package com.cinebooking.finance;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class FinanceDtos {
    private FinanceDtos(){}

    public record LedgerLineView(String accountCode,String direction,BigDecimal amount,String currency){}
    public record LedgerEntryView(UUID id,String eventKey,String eventType,UUID bookingId,UUID paymentId,UUID userId,
                                  String description,Instant occurredAt,List<LedgerLineView> lines){}
    public record ReconciliationIssueView(UUID id,UUID runId,String issueType,String severity,String entityType,String entityId,
                                          BigDecimal expectedValue,BigDecimal actualValue,String message,String status,
                                          Instant createdAt,Instant resolvedAt,String resolvedBy){}
    public record ReconciliationRunView(UUID id,String runKey,LocalDate businessDate,String status,int paymentCount,
                                        BigDecimal paymentAmount,BigDecimal ledgerCaptureAmount,int refundCount,
                                        BigDecimal refundAmount,BigDecimal ledgerRefundAmount,int loyaltyUsersChecked,
                                        int loyaltyMismatchCount,int issueCount,String startedBy,Instant startedAt,Instant finishedAt){}
    public record FinanceDashboard(LocalDate businessDate,BigDecimal capturedAmount,BigDecimal refundedAmount,BigDecimal netAmount,
                                   ReconciliationRunView latestRun,List<ReconciliationRunView> recentRuns,
                                   List<LedgerEntryView> ledgerEntries,List<ReconciliationIssueView> openIssues){}
}
