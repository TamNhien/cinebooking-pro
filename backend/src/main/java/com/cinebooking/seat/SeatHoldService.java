package com.cinebooking.seat;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class SeatHoldService {
    private final StringRedisTemplate redis;
    private final long ttlSeconds;

    private static final DefaultRedisScript<Long> ACQUIRE = new DefaultRedisScript<>("""
        for i,key in ipairs(KEYS) do
          local owner = redis.call('get', key)
          if owner and owner ~= ARGV[1] then return 0 end
        end
        for i,key in ipairs(KEYS) do
          redis.call('set', key, ARGV[1], 'PX', ARGV[2])
        end
        return 1
        """, Long.class);

    private static final DefaultRedisScript<Long> RELEASE = new DefaultRedisScript<>("""
        local deleted = 0
        for i,key in ipairs(KEYS) do
          if redis.call('get', key) == ARGV[1] then
            deleted = deleted + redis.call('del', key)
          end
        end
        return deleted
        """, Long.class);

    public SeatHoldService(StringRedisTemplate redis, @Value("${app.seat-hold.ttl-seconds}") long ttlSeconds) {
        this.redis = redis; this.ttlSeconds = ttlSeconds;
    }

    public boolean acquire(UUID showtimeId, List<UUID> seatIds, UUID userId) {
        List<String> keys = seatIds.stream().distinct().map(id -> key(showtimeId,id)).toList();
        if (keys.isEmpty()) return false;
        Long result = redis.execute(ACQUIRE, keys, userId.toString(), Long.toString(Duration.ofSeconds(ttlSeconds).toMillis()));
        return result != null && result == 1L;
    }

    public void release(UUID showtimeId, List<UUID> seatIds, UUID userId) {
        List<String> keys = seatIds.stream().distinct().map(id -> key(showtimeId,id)).toList();
        if (!keys.isEmpty()) redis.execute(RELEASE, keys, userId.toString());
    }

    public boolean ownsAll(UUID showtimeId, List<UUID> seatIds, UUID userId) {
        List<String> keys = seatIds.stream().distinct().map(id -> key(showtimeId,id)).toList();
        List<String> values = redis.opsForValue().multiGet(keys);
        if (values == null || values.size() != keys.size()) return false;
        return values.stream().allMatch(userId.toString()::equals);
    }

    public List<String> holders(UUID showtimeId, List<UUID> seatIds) {
        if (seatIds.isEmpty()) return List.of();
        List<String> keys = new ArrayList<>();
        for (UUID seatId : seatIds) keys.add(key(showtimeId, seatId));
        List<String> values = redis.opsForValue().multiGet(keys);
        return values == null ? java.util.Collections.nCopies(keys.size(), null) : values;
    }

    /**
     * Server-authoritative remaining TTL for a user's current hold. Returning the minimum TTL keeps a
     * multi-seat hold consistent even if Redis keys were refreshed a few milliseconds apart.
     */
    public long remainingSeconds(UUID showtimeId, List<UUID> seatIds, UUID userId) {
        if (userId == null || seatIds == null || seatIds.isEmpty()) return 0;
        long remaining = Long.MAX_VALUE;
        boolean found = false;
        for (UUID seatId : seatIds.stream().distinct().toList()) {
            String redisKey = key(showtimeId, seatId);
            String owner = redis.opsForValue().get(redisKey);
            if (!userId.toString().equals(owner)) continue;
            Long ttl = redis.getExpire(redisKey, TimeUnit.SECONDS);
            if (ttl != null && ttl > 0) {
                remaining = Math.min(remaining, ttl);
                found = true;
            }
        }
        return found ? remaining : 0;
    }

    public long ttlSeconds() { return ttlSeconds; }
    private String key(UUID showtimeId, UUID seatId) { return "hold:" + showtimeId + ":" + seatId; }
}
