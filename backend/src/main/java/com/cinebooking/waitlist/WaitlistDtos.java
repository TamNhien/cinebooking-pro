package com.cinebooking.waitlist;

import java.time.Instant;
import java.util.UUID;

public final class WaitlistDtos {
    private WaitlistDtos(){}
    public record WaitlistStatus(UUID showtimeId, boolean subscribed, String status, int availableSeats, Instant createdAt, Instant notifiedAt){}
    public record WaitlistItem(UUID id, UUID showtimeId, String movieTitle, Instant showtimeStart, String cinemaName, String auditoriumName, String status, int lastAvailableCount, Instant createdAt, Instant notifiedAt){}
}
