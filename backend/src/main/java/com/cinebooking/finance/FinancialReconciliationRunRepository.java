package com.cinebooking.finance;

import com.cinebooking.domain.FinancialReconciliationRun;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.*;
import java.util.*;

public interface FinancialReconciliationRunRepository extends JpaRepository<FinancialReconciliationRun,UUID> {
    Optional<FinancialReconciliationRun> findByRunKey(String runKey);
    Optional<FinancialReconciliationRun> findFirstByBusinessDateOrderByStartedAtDesc(LocalDate businessDate);
    List<FinancialReconciliationRun> findTop30ByOrderByStartedAtDesc();

    @Modifying
    @Query(value="""
        insert into financial_reconciliation_run
            (id,run_key,business_date,status,payment_count,payment_amount,ledger_capture_amount,refund_count,refund_amount,ledger_refund_amount,
             loyalty_users_checked,loyalty_mismatch_count,issue_count,started_by,started_at)
        values (:id,:runKey,:businessDate,'RUNNING',0,0,0,0,0,0,0,0,0,:startedBy,now())
        on conflict (run_key) do nothing
        """,nativeQuery=true)
    int insertOnce(@Param("id") UUID id,@Param("runKey") String runKey,@Param("businessDate") LocalDate businessDate,@Param("startedBy") String startedBy);
}
