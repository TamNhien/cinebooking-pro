package com.cinebooking.finance;

import com.cinebooking.audit.AuditService;
import com.cinebooking.commerce.LoyaltyPointLotRepository;
import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.payment.PaymentRepository;
import com.cinebooking.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.*;
import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.cinebooking.finance.FinanceDtos.*;

@Service
public class FinancialLedgerService {
    private static final ZoneId BUSINESS_ZONE=ZoneId.of("Asia/Ho_Chi_Minh");
    private final FinancialLedgerEntryRepository entries;
    private final FinancialLedgerLineRepository lines;
    private final FinancialReconciliationRunRepository runs;
    private final FinancialReconciliationIssueRepository issues;
    private final PaymentRepository payments;
    private final UserRepository users;
    private final LoyaltyPointLotRepository pointLots;
    private final AuditService audit;

    public FinancialLedgerService(FinancialLedgerEntryRepository entries,FinancialLedgerLineRepository lines,
                                  FinancialReconciliationRunRepository runs,FinancialReconciliationIssueRepository issues,
                                  PaymentRepository payments,UserRepository users,
                                  LoyaltyPointLotRepository pointLots,AuditService audit){
        this.entries=entries;this.lines=lines;this.runs=runs;this.issues=issues;this.payments=payments;
        this.users=users;this.pointLots=pointLots;this.audit=audit;
    }

    @Transactional
    public void recordPaymentCapture(Payment payment,Booking booking){
        if(payment==null||booking==null)return;
        BigDecimal amount=money(payment.getAmount());
        Instant occurred=payment.getPaidAt()==null?Instant.now():payment.getPaidAt();
        post("PAYMENT_CAPTURE:"+payment.getId(),"PAYMENT_CAPTURED",booking.getId(),payment.getId(),payment.getPayerUserId(),occurred,
                "Captured "+amount.toPlainString()+" VND via "+payment.getProvider(),amount,
                "PAYMENT_CLEARING:"+providerAccount(payment.getProvider()),"CUSTOMER_FUNDS_CAPTURED");
    }

    @Transactional
    public void recordRefund(Payment payment,Booking booking){
        if(payment==null||booking==null)return;
        BigDecimal amount=money(payment.getRefundedAmount()==null?booking.getRefundAmount():payment.getRefundedAmount());
        Instant occurred=payment.getRefundedAt()==null?Instant.now():payment.getRefundedAt();
        post("REFUND:"+payment.getId(),"REFUND_SETTLED",booking.getId(),payment.getId(),payment.getPayerUserId(),occurred,
                "Refunded "+amount.toPlainString()+" VND via "+payment.getProvider(),amount,
                "CUSTOMER_FUNDS_REFUNDED","PAYMENT_CLEARING:"+providerAccount(payment.getProvider()));
    }

    private void post(String eventKey,String eventType,UUID bookingId,UUID paymentId,UUID userId,Instant occurredAt,
                      String description,BigDecimal amount,String debitAccount,String creditAccount){
        UUID entryId=UUID.randomUUID();
        int inserted=entries.insertOnce(entryId,eventKey,eventType,bookingId,paymentId,userId,description,occurredAt);
        if(inserted==0)return;
        if(amount.signum()==0)return;
        if(amount.signum()<0)throw new IllegalArgumentException("Financial ledger amount must be non-negative");
        List<FinancialLedgerLine> batch=List.of(line(entryId,debitAccount,"DEBIT",amount),line(entryId,creditAccount,"CREDIT",amount));
        BigDecimal debit=batch.stream().filter(x->"DEBIT".equals(x.getDirection())).map(FinancialLedgerLine::getAmount).reduce(BigDecimal.ZERO,BigDecimal::add);
        BigDecimal credit=batch.stream().filter(x->"CREDIT".equals(x.getDirection())).map(FinancialLedgerLine::getAmount).reduce(BigDecimal.ZERO,BigDecimal::add);
        if(debit.compareTo(credit)!=0)throw new IllegalStateException("Unbalanced financial ledger event "+eventKey);
        lines.saveAll(batch);
    }

    private FinancialLedgerLine line(UUID entryId,String account,String direction,BigDecimal amount){
        FinancialLedgerLine l=new FinancialLedgerLine();l.setEntryId(entryId);l.setAccountCode(account);l.setDirection(direction);l.setAmount(money(amount));l.setCurrency("VND");return l;
    }

    @Transactional
    public ReconciliationRunView reconcile(LocalDate businessDate,String actor,String ip){
        LocalDate day=businessDate==null?LocalDate.now(BUSINESS_ZONE):businessDate;
        String runKey="MANUAL:"+UUID.randomUUID();
        ReconciliationRunView view=reconcileInternal(day,runKey,actor==null?"ADMIN":actor);
        audit.record(actor,"FINANCE_RECONCILE","DATE",day.toString(),"run="+view.id()+", issues="+view.issueCount(),ip);
        return view;
    }

    @Transactional
    public ReconciliationRunView reconcileScheduled(LocalDate businessDate){
        LocalDate day=businessDate==null?LocalDate.now(BUSINESS_ZONE).minusDays(1):businessDate;
        return reconcileInternal(day,"AUTO:"+day,"SYSTEM");
    }

    private ReconciliationRunView reconcileInternal(LocalDate day,String runKey,String actor){
        UUID proposed=UUID.randomUUID();
        int claimed=runs.insertOnce(proposed,runKey,day,actor);
        if(claimed==0)return runs.findByRunKey(runKey).map(this::runView).orElseThrow();
        FinancialReconciliationRun run=runs.findByRunKey(runKey).orElseThrow();
        Instant from=day.atStartOfDay(BUSINESS_ZONE).toInstant();
        Instant to=day.plusDays(1).atStartOfDay(BUSINESS_ZONE).toInstant();

        List<Payment> paid=payments.findByPaidAtGreaterThanEqualAndPaidAtLessThanAndStatusIn(from,to,List.of(PaymentStatus.SUCCESS,PaymentStatus.REFUNDED,PaymentStatus.REVIEW));
        List<Payment> refunded=payments.findByRefundedAtGreaterThanEqualAndRefundedAtLessThanAndStatus(from,to,PaymentStatus.REFUNDED);
        List<FinancialLedgerEntry> ledgerEntries=entries.findByOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtAsc(from,to);
        Map<String,FinancialLedgerEntry> byKey=ledgerEntries.stream().collect(Collectors.toMap(FinancialLedgerEntry::getEventKey,Function.identity(),(a,b)->a,LinkedHashMap::new));
        Map<UUID,List<FinancialLedgerLine>> lineMap=lineMap(ledgerEntries);
        List<FinancialReconciliationIssue> found=new ArrayList<>();

        BigDecimal paymentAmount=sumPayments(paid,Payment::getAmount);
        BigDecimal refundAmount=sumPayments(refunded,p->p.getRefundedAmount()==null?BigDecimal.ZERO:p.getRefundedAmount());
        BigDecimal captureLedger=ledgerAmount(ledgerEntries,lineMap,"PAYMENT_CAPTURED");
        BigDecimal refundLedger=ledgerAmount(ledgerEntries,lineMap,"REFUND_SETTLED");

        for(Payment p:paid){
            String key="PAYMENT_CAPTURE:"+p.getId(); FinancialLedgerEntry e=byKey.get(key); BigDecimal expected=money(p.getAmount());
            if(e==null){found.add(issue(run,"PAYMENT_LEDGER_MISSING","CRITICAL","PAYMENT",p.getId().toString(),expected,BigDecimal.ZERO,"Payment SUCCESS/REFUNDED has no immutable capture ledger event"));continue;}
            BigDecimal actual=entryDebit(lineMap.getOrDefault(e.getId(),List.of()));
            if(actual.compareTo(expected)!=0)found.add(issue(run,"PAYMENT_LEDGER_AMOUNT_MISMATCH","CRITICAL","PAYMENT",p.getId().toString(),expected,actual,"Capture ledger amount differs from payment amount"));
        }
        for(Payment p:refunded){
            String key="REFUND:"+p.getId(); FinancialLedgerEntry e=byKey.get(key); BigDecimal expected=money(p.getRefundedAmount());
            if(e==null){found.add(issue(run,"REFUND_LEDGER_MISSING","CRITICAL","PAYMENT",p.getId().toString(),expected,BigDecimal.ZERO,"Refunded payment has no immutable refund ledger event"));continue;}
            BigDecimal actual=entryDebit(lineMap.getOrDefault(e.getId(),List.of()));
            if(actual.compareTo(expected)!=0)found.add(issue(run,"REFUND_LEDGER_AMOUNT_MISMATCH","CRITICAL","PAYMENT",p.getId().toString(),expected,actual,"Refund ledger amount differs from refunded amount"));
        }
        if(captureLedger.compareTo(paymentAmount)!=0)found.add(issue(run,"CAPTURE_TOTAL_MISMATCH","CRITICAL","DATE",day.toString(),paymentAmount,captureLedger,"Daily captured payment total differs from PAYMENT_CAPTURED ledger total"));
        if(refundLedger.compareTo(refundAmount)!=0)found.add(issue(run,"REFUND_TOTAL_MISMATCH","CRITICAL","DATE",day.toString(),refundAmount,refundLedger,"Daily refund total differs from REFUND_SETTLED ledger total"));

        int loyaltyChecked=0,loyaltyMismatch=0;
        for(AppUser u:users.findAllByOrderByCreatedAtDesc()){
            if(u.getRole()!=Role.USER)continue;
            int actual=u.getLoyaltyPoints()==null?0:u.getLoyaltyPoints();
            long lotBalance=Optional.ofNullable(pointLots.sumRemainingPoints(u.getId())).orElse(0L);
            loyaltyChecked++;
            if(actual!=lotBalance){loyaltyMismatch++;found.add(issue(run,"LOYALTY_BALANCE_MISMATCH","WARNING","USER",u.getId().toString(),BigDecimal.valueOf(actual),BigDecimal.valueOf(lotBalance),"app_user.loyalty_points differs from remaining loyalty point lots"));}
        }

        issues.saveAll(found);
        run.setPaymentCount(paid.size());run.setPaymentAmount(paymentAmount);run.setLedgerCaptureAmount(captureLedger);
        run.setRefundCount(refunded.size());run.setRefundAmount(refundAmount);run.setLedgerRefundAmount(refundLedger);
        run.setLoyaltyUsersChecked(loyaltyChecked);run.setLoyaltyMismatchCount(loyaltyMismatch);run.setIssueCount(found.size());
        run.setStatus(found.isEmpty()?"CLEAN":"ISSUES");run.setFinishedAt(Instant.now());runs.save(run);
        return runView(run);
    }

    public FinanceDashboard dashboard(LocalDate businessDate){
        LocalDate day=businessDate==null?LocalDate.now(BUSINESS_ZONE):businessDate;
        Instant from=day.atStartOfDay(BUSINESS_ZONE).toInstant();Instant to=day.plusDays(1).atStartOfDay(BUSINESS_ZONE).toInstant();
        List<FinancialLedgerEntry> allDayEntries=entries.findByOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtAsc(from,to);
        Map<UUID,List<FinancialLedgerLine>> allLineMap=lineMap(allDayEntries);
        BigDecimal captured=ledgerAmount(allDayEntries,allLineMap,"PAYMENT_CAPTURED");BigDecimal refunded=ledgerAmount(allDayEntries,allLineMap,"REFUND_SETTLED");
        List<FinancialLedgerEntry> displayEntries=entries.findTop200ByOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtDesc(from,to);
        Map<UUID,List<FinancialLedgerLine>> displayLineMap=lineMap(displayEntries);
        ReconciliationRunView latest=runs.findFirstByBusinessDateOrderByStartedAtDesc(day).map(this::runView).orElse(null);
        return new FinanceDashboard(day,captured,refunded,captured.subtract(refunded),latest,
                runs.findTop30ByOrderByStartedAtDesc().stream().map(this::runView).toList(),
                displayEntries.stream().map(e->entryView(e,displayLineMap.getOrDefault(e.getId(),List.of()))).toList(),
                issues.findTop200ByStatusOrderByCreatedAtDesc("OPEN").stream().map(this::issueView).toList());
    }

    @Transactional
    public ReconciliationIssueView resolveIssue(UUID id,String actor,String ip){
        FinancialReconciliationIssue issue=issues.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy reconciliation issue"));
        if("RESOLVED".equals(issue.getStatus()))return issueView(issue);
        issue.setStatus("RESOLVED");issue.setResolvedAt(Instant.now());issue.setResolvedBy(actor);issues.save(issue);
        audit.record(actor,"FINANCE_ISSUE_RESOLVE","FINANCE_ISSUE",id.toString(),issue.getIssueType(),ip);return issueView(issue);
    }

    private Map<UUID,List<FinancialLedgerLine>> lineMap(List<FinancialLedgerEntry> ledgerEntries){
        if(ledgerEntries.isEmpty())return Map.of();
        List<UUID> ids=ledgerEntries.stream().map(FinancialLedgerEntry::getId).toList();
        Map<UUID,List<FinancialLedgerLine>> out=new HashMap<>();
        for(int i=0;i<ids.size();i+=1000){
            List<UUID> batch=ids.subList(i,Math.min(ids.size(),i+1000));
            for(FinancialLedgerLine l:lines.findByEntryIdIn(batch))out.computeIfAbsent(l.getEntryId(),k->new ArrayList<>()).add(l);
        }
        return out;
    }
    private BigDecimal ledgerAmount(List<FinancialLedgerEntry> es,Map<UUID,List<FinancialLedgerLine>> lineMap,String type){return money(es.stream().filter(e->type.equals(e.getEventType())).map(e->entryDebit(lineMap.getOrDefault(e.getId(),List.of()))).reduce(BigDecimal.ZERO,BigDecimal::add));}
    private BigDecimal entryDebit(List<FinancialLedgerLine> ls){return money(ls.stream().filter(l->"DEBIT".equals(l.getDirection())).map(FinancialLedgerLine::getAmount).reduce(BigDecimal.ZERO,BigDecimal::add));}
    private BigDecimal sumPayments(List<Payment> ps,Function<Payment,BigDecimal> f){return money(ps.stream().map(f).filter(Objects::nonNull).reduce(BigDecimal.ZERO,BigDecimal::add));}
    private BigDecimal money(BigDecimal v){return (v==null?BigDecimal.ZERO:v).setScale(2,RoundingMode.HALF_UP);}
    private String providerAccount(String provider){String p=provider==null?"UNKNOWN":provider.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9_]","_");return p.length()>50?p.substring(0,50):p;}

    private FinancialReconciliationIssue issue(FinancialReconciliationRun run,String type,String severity,String entityType,String entityId,BigDecimal expected,BigDecimal actual,String message){
        FinancialReconciliationIssue i=new FinancialReconciliationIssue();i.setRunId(run.getId());i.setIssueType(type);i.setSeverity(severity);i.setEntityType(entityType);i.setEntityId(entityId);i.setExpectedValue(money(expected));i.setActualValue(money(actual));i.setMessage(message);return i;
    }
    private LedgerEntryView entryView(FinancialLedgerEntry e,List<FinancialLedgerLine> ls){return new LedgerEntryView(e.getId(),e.getEventKey(),e.getEventType(),e.getBookingId(),e.getPaymentId(),e.getUserId(),e.getDescription(),e.getOccurredAt(),ls.stream().map(l->new LedgerLineView(l.getAccountCode(),l.getDirection(),l.getAmount(),l.getCurrency())).toList());}
    private ReconciliationIssueView issueView(FinancialReconciliationIssue i){return new ReconciliationIssueView(i.getId(),i.getRunId(),i.getIssueType(),i.getSeverity(),i.getEntityType(),i.getEntityId(),i.getExpectedValue(),i.getActualValue(),i.getMessage(),i.getStatus(),i.getCreatedAt(),i.getResolvedAt(),i.getResolvedBy());}
    private ReconciliationRunView runView(FinancialReconciliationRun r){return new ReconciliationRunView(r.getId(),r.getRunKey(),r.getBusinessDate(),r.getStatus(),r.getPaymentCount(),r.getPaymentAmount(),r.getLedgerCaptureAmount(),r.getRefundCount(),r.getRefundAmount(),r.getLedgerRefundAmount(),r.getLoyaltyUsersChecked(),r.getLoyaltyMismatchCount(),r.getIssueCount(),r.getStartedBy(),r.getStartedAt(),r.getFinishedAt());}
}
