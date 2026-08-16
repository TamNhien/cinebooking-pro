package com.cinebooking.engagement;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public final class EngagementDtos {
    private EngagementDtos() {}
    public record FavoriteState(boolean favorite) {}
    public record ReviewRequest(@Min(1) @Max(5) int rating, @Size(max = 1500) String comment) {}
    public record ReviewResponse(UUID id, UUID movieId, UUID userId, String userName, int rating, String comment,
                                 Instant createdAt, Instant updatedAt, boolean mine) {}
    public record RatingSummary(double averageRating, long reviewCount) {}
}
