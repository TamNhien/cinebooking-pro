package com.cinebooking.websocket;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class SeatEventPublisher {
    public static final String CHANNEL = "cinebooking:seat-events";
    private final StringRedisTemplate redis;
    public SeatEventPublisher(StringRedisTemplate redis){this.redis=redis;}

    public void publish(UUID showtimeId, String type, List<UUID> seatIds) {
        String ids = seatIds.stream().map(UUID::toString).collect(Collectors.joining(","));
        redis.convertAndSend(CHANNEL, type + "|" + showtimeId + "|" + ids + "|" + Instant.now());
    }
}
