package com.cinebooking.support;
import com.cinebooking.domain.CustomerSupportCaseEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface CustomerSupportCaseEventRepository extends JpaRepository<CustomerSupportCaseEvent,UUID>{
    List<CustomerSupportCaseEvent> findByCaseIdOrderByCreatedAtAsc(UUID caseId);
}
