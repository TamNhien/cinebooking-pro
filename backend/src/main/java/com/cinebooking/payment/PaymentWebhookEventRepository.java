package com.cinebooking.payment;

import com.cinebooking.domain.PaymentWebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentWebhookEventRepository extends JpaRepository<PaymentWebhookEvent, UUID> {
    Optional<PaymentWebhookEvent> findByProviderAndEventKey(String provider, String eventKey);
    List<PaymentWebhookEvent> findTop100ByOrderByReceivedAtDesc();

    @Modifying
    @Query(value = """
        INSERT INTO payment_webhook_event
            (id, provider, event_key, payment_id, payload_hash, signature_valid, result_code, received_at)
        VALUES
            (:id, :provider, :eventKey, :paymentId, :payloadHash, :signatureValid, :resultCode, :receivedAt)
        ON CONFLICT (provider, event_key) DO NOTHING
        """, nativeQuery = true)
    int claim(@Param("id") UUID id,
              @Param("provider") String provider,
              @Param("eventKey") String eventKey,
              @Param("paymentId") UUID paymentId,
              @Param("payloadHash") String payloadHash,
              @Param("signatureValid") boolean signatureValid,
              @Param("resultCode") String resultCode,
              @Param("receivedAt") Instant receivedAt);
}
