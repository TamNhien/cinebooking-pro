package com.cinebooking.finance;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.*;

@Component
public class FinancialReconciliationJob {
    private static final ZoneId BUSINESS_ZONE=ZoneId.of("Asia/Ho_Chi_Minh");
    private final FinancialLedgerService finance;
    private final boolean enabled;
    public FinancialReconciliationJob(FinancialLedgerService finance,@Value("${app.finance.auto-reconcile-enabled:true}") boolean enabled){this.finance=finance;this.enabled=enabled;}
    @Scheduled(cron="${app.finance.daily-close-cron:0 10 1 * * *}",zone="Asia/Ho_Chi_Minh")
    public void dailyClose(){if(!enabled)return;finance.reconcileScheduled(LocalDate.now(BUSINESS_ZONE).minusDays(1));}
}
