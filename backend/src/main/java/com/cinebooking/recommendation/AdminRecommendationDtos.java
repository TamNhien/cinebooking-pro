package com.cinebooking.recommendation;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class AdminRecommendationDtos {
    private AdminRecommendationDtos() {}

    public record RecommendationCoverageV76(
            double actionableMoviePercent,
            double metadataCompletePercent,
            double personalizableUserPercent,
            String qualityStatus
    ) {}

    public record RecommendationMovieMetricV76(
            UUID movieId,
            String movieTitle,
            long clicks,
            long views,
            long feedback,
            long assistedBookings
    ) {}

    public record RecommendationSourceMetricV76(
            String source,
            long clicks,
            long views,
            long totalEvents
    ) {}

    public record RecommendationAdminSummaryV76(
            String strategyVersion,
            Instant generatedAt,
            int windowDays,
            Instant windowStart,
            Instant windowEnd,
            long activeMovies,
            long actionableMovies,
            long metadataCompleteMovies,
            long registeredUsers,
            long personalizableUsers,
            long recommendationEvents,
            long recommendationClicks,
            long recommendationViews,
            long explicitFeedback,
            long moreLikeFeedback,
            long lessLikeFeedback,
            long hiddenFeedback,
            long assistedConfirmedBookings,
            BigDecimal assistedRealizedRevenue,
            RecommendationCoverageV76 coverage,
            List<RecommendationMovieMetricV76> topMovies,
            List<RecommendationSourceMetricV76> topSources,
            List<String> evidencePolicy
    ) {}
}
