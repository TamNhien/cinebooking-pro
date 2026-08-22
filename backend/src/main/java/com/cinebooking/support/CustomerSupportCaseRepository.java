package com.cinebooking.support;
import com.cinebooking.domain.CustomerSupportCase;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.Instant;
import java.util.*;
public interface CustomerSupportCaseRepository extends JpaRepository<CustomerSupportCase,UUID>{
    List<CustomerSupportCase> findTop100ByUserIdOrderByCreatedAtDesc(UUID userId);
    List<CustomerSupportCase> findTop200ByCinemaIdOrderByCreatedAtDesc(UUID cinemaId);
    List<CustomerSupportCase> findTop200ByOrderByCreatedAtDesc();
    List<CustomerSupportCase> findTop200ByCinemaIdIsNullOrderByCreatedAtDesc();
    long countByCinemaIdAndStatusIn(UUID cinemaId,Collection<String> statuses);
    long countByCinemaIdAndStatus(UUID cinemaId,String status);
    long countByCinemaIdAndPriorityAndStatusIn(UUID cinemaId,String priority,Collection<String> statuses);
    long countByCinemaIdAndSlaDueAtBeforeAndStatusIn(UUID cinemaId,Instant dueAt,Collection<String> statuses);
}
