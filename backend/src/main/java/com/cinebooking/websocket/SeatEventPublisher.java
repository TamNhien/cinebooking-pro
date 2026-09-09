package com.cinebooking.websocket;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class SeatEventPublisher {
    public static final String CHANNEL = "cinebooking:seat-events";
    private static final Logger log=LoggerFactory.getLogger(SeatEventPublisher.class);
    private final StringRedisTemplate redis;
    public SeatEventPublisher(StringRedisTemplate redis){this.redis=redis;}

    /** V66: realtime fan-out is best-effort; Redis outage must never roll back durable seat ownership. */
    public void publish(UUID showtimeId, String type, List<UUID> seatIds) {
        String ids = seatIds.stream().map(UUID::toString).collect(Collectors.joining(","));
        try{redis.convertAndSend(CHANNEL, type + "|" + showtimeId + "|" + ids + "|" + Instant.now());}
        catch(RuntimeException ex){log.warn("seat_event_publish_degraded showtime={} type={} seats={} error={}",showtimeId,type,seatIds.size(),ex.getClass().getSimpleName());}
    }
}
