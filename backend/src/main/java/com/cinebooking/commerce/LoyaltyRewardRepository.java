package com.cinebooking.commerce;
import com.cinebooking.domain.LoyaltyReward;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface LoyaltyRewardRepository extends JpaRepository<LoyaltyReward,UUID>{List<LoyaltyReward> findByActiveTrueOrderBySortOrderAscPointsCostAsc();Optional<LoyaltyReward> findByCodeIgnoreCase(String code);}
