package com.cinebooking.finance;

import com.cinebooking.domain.FinancialLedgerLine;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface FinancialLedgerLineRepository extends JpaRepository<FinancialLedgerLine,UUID> {
    List<FinancialLedgerLine> findByEntryIdOrderByCreatedAtAsc(UUID entryId);
    List<FinancialLedgerLine> findByEntryIdIn(Collection<UUID> entryIds);
}
