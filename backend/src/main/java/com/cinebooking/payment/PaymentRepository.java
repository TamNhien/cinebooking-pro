package com.cinebooking.payment;
import com.cinebooking.domain.Payment;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    List<Payment> findByBookingIdOrderByCreatedAtDesc(UUID bookingId);
    Optional<Payment> findFirstByBookingIdOrderByCreatedAtDesc(UUID bookingId);
    Optional<Payment> findByProviderAndProviderTransactionId(String provider, String providerTransactionId);
    Optional<Payment> findByProviderInAndProviderTransactionId(Collection<String> providers, String providerTransactionId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") UUID id);
}
