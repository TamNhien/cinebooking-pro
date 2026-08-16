package com.cinebooking.websocket;

import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Component
public class RedisSeatEventSubscriber implements MessageListener {
    private final SimpMessagingTemplate messaging;
    public RedisSeatEventSubscriber(SimpMessagingTemplate messaging){this.messaging=messaging;}

    @Override public void onMessage(Message message, byte[] pattern) {
        try {
            String raw = new String(message.getBody(), StandardCharsets.UTF_8);
            String[] p = raw.split("\\|", -1);
            if (p.length < 4) return;
            UUID showtimeId = UUID.fromString(p[1]);
            List<UUID> seatIds = p[2].isBlank() ? List.of() : Arrays.stream(p[2].split(",")).map(UUID::fromString).toList();
            SeatEvent event = new SeatEvent(p[0], showtimeId, seatIds, Instant.parse(p[3]));
            messaging.convertAndSend("/topic/showtimes/" + showtimeId + "/seats", event);
        } catch (RuntimeException ignored) {}
    }

    public record SeatEvent(String type, UUID showtimeId, List<UUID> seatIds, Instant at) {}
}
