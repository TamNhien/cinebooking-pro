package com.cinebooking.finance;

import com.cinebooking.domain.FinancialLedgerEntry;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.*;

public interface FinancialLedgerEntryRepository extends JpaRepository<FinancialLedgerEntry,UUID> {
    Optional<FinancialLedgerEntry> findByEventKey(String eventKey);
    List<FinancialLedgerEntry> findByOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtAsc(Instant from,Instant to);
    List<FinancialLedgerEntry> findTop200ByOccurredAtGreaterThanEqualAndOccurredAtLessThanOrderByOccurredAtDesc(Instant from,Instant to);

    @Modifying
    @Query(value="""
        insert into financial_ledger_entry
            (id,event_key,event_type,booking_id,payment_id,user_id,source,description,occurred_at,created_at)
        values
            (:id,:eventKey,:eventType,:bookingId,:paymentId,:userId,'CINEBOOKING',:description,:occurredAt,now())
        on conflict (event_key) do nothing
        """,nativeQuery=true)
    int insertOnce(@Param("id") UUID id,@Param("eventKey") String eventKey,@Param("eventType") String eventType,
                   @Param("bookingId") UUID bookingId,@Param("paymentId") UUID paymentId,@Param("userId") UUID userId,
                   @Param("description") String description,@Param("occurredAt") Instant occurredAt);
}
