package com.cinebooking.websocket;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;

@Component
public class OperationsSignalPublisher {
    public static final String CHANNEL = "cinebooking:operations-control-events";
    private final StringRedisTemplate redis;

    public OperationsSignalPublisher(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void publish(String type) {
        if (type == null || type.isBlank()) return;
        String safe = type.replace('|', '_').trim();
        Runnable send = () -> redis.convertAndSend(CHANNEL, safe + "|" + Instant.now());
        if (TransactionSynchronizationManager.isActualTransactionActive()
                && TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { send.run(); }
            });
        } else {
            send.run();
        }
    }
}
