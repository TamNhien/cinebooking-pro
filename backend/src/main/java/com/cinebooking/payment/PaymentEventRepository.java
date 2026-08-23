package com.cinebooking.payment;

import com.cinebooking.domain.PaymentEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface PaymentEventRepository extends JpaRepository<PaymentEvent, UUID> {
    List<PaymentEvent> findByPaymentIdOrderByCreatedAtAsc(UUID paymentId);
    List<PaymentEvent> findTop200ByOrderByCreatedAtDesc();
}
