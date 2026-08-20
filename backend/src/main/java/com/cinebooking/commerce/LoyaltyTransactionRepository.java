package com.cinebooking.commerce;
import com.cinebooking.domain.LoyaltyTransaction; import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface LoyaltyTransactionRepository extends JpaRepository<LoyaltyTransaction,UUID>{ List<LoyaltyTransaction> findTop50ByUserIdOrderByCreatedAtDesc(UUID userId); Optional<LoyaltyTransaction> findFirstByUserIdAndBookingIdAndTransactionTypeOrderByCreatedAtDesc(UUID userId,UUID bookingId,String transactionType); }
