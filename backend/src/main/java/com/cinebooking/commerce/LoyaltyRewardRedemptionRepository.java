package com.cinebooking.commerce;
import com.cinebooking.domain.LoyaltyRewardRedemption;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface LoyaltyRewardRedemptionRepository extends JpaRepository<LoyaltyRewardRedemption,UUID>{
 List<LoyaltyRewardRedemption> findTop50ByUserIdOrderByRedeemedAtDesc(UUID userId);
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select r from LoyaltyRewardRedemption r where upper(r.redemptionCode)=upper(:code)") Optional<LoyaltyRewardRedemption> findByCodeForUpdate(@Param("code") String code);
}
