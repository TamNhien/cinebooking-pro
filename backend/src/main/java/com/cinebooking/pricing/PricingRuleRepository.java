package com.cinebooking.pricing;

import com.cinebooking.domain.PricingRule;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface PricingRuleRepository extends JpaRepository<PricingRule, UUID> {
    List<PricingRule> findAllByOrderByPriorityDescCreatedAtDesc();
    List<PricingRule> findByActiveTrueOrderByPriorityDescCreatedAtAsc();
}
