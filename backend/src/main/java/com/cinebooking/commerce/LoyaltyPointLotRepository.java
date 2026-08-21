package com.cinebooking.commerce;

import com.cinebooking.domain.LoyaltyPointLot;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.*;

public interface LoyaltyPointLotRepository extends JpaRepository<LoyaltyPointLot,UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from LoyaltyPointLot l where l.userId=:userId and l.remainingPoints>0 order by l.expiresAt asc,l.createdAt asc,l.id asc")
    List<LoyaltyPointLot> findSpendableForUpdate(@Param("userId") UUID userId);

    List<LoyaltyPointLot> findTop100ByExpiresAtLessThanEqualAndRemainingPointsGreaterThanOrderByExpiresAtAsc(Instant expiresAt,Integer remainingPoints);
    List<LoyaltyPointLot> findByRemainingPointsGreaterThan(Integer remainingPoints);
    List<LoyaltyPointLot> findByUserIdAndRemainingPointsGreaterThan(UUID userId,Integer remainingPoints);

    @Query(value="select coalesce(sum(remaining_points),0) from loyalty_point_lot where user_id=:userId",nativeQuery=true)
    Long sumRemainingPoints(@Param("userId") UUID userId);
}
