package com.cinebooking.payment;
import com.cinebooking.domain.Payment;
import com.cinebooking.domain.PaymentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.*;
public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    List<Payment> findByBookingIdOrderByCreatedAtDesc(UUID bookingId);
    List<Payment> findByBookingIdInOrderByCreatedAtDesc(Collection<UUID> bookingIds);
    List<Payment> findByPayerUserIdOrderByCreatedAtDesc(UUID payerUserId);
    Optional<Payment> findFirstByBookingIdOrderByCreatedAtDesc(UUID bookingId);
    Optional<Payment> findByBookingIdAndClientIdempotencyKey(UUID bookingId,String clientIdempotencyKey);
    Optional<Payment> findByProviderAndProviderTransactionId(String provider, String providerTransactionId);
    Optional<Payment> findByProviderInAndProviderOrderId(Collection<String> providers, String providerOrderId);
    List<Payment> findTop200ByOrderByCreatedAtDesc();
    List<Payment> findByStatusAndExpiresAtBefore(PaymentStatus status, Instant before);
    List<Payment> findByPaidAtGreaterThanEqualAndPaidAtLessThanAndStatusIn(Instant from,Instant to,Collection<PaymentStatus> statuses);
    List<Payment> findByRefundedAtGreaterThanEqualAndRefundedAtLessThanAndStatus(Instant from,Instant to,PaymentStatus status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Payment p where p.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") UUID id);
}
