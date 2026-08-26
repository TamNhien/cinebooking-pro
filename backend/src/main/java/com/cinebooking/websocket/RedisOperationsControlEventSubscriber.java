package com.cinebooking.websocket;

import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;

@Component
public class RedisOperationsControlEventSubscriber implements MessageListener {
    private final SimpMessagingTemplate messaging;

    public RedisOperationsControlEventSubscriber(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String[] parts = new String(message.getBody(), StandardCharsets.UTF_8).split("\\|", -1);
            if (parts.length < 2) return;
            messaging.convertAndSend(
                    "/topic/operations-control",
                    new Event(parts[0], Instant.parse(parts[1]))
            );
        } catch (RuntimeException ignored) {
        }
    }

    public record Event(String type, Instant at) {}
}
