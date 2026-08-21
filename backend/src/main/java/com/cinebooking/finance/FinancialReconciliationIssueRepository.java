package com.cinebooking.finance;

import com.cinebooking.domain.FinancialReconciliationIssue;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface FinancialReconciliationIssueRepository extends JpaRepository<FinancialReconciliationIssue,UUID> {
    List<FinancialReconciliationIssue> findByRunIdOrderByCreatedAtAsc(UUID runId);
    List<FinancialReconciliationIssue> findTop200ByStatusOrderByCreatedAtDesc(String status);
}
