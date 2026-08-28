package com.cinebooking.recommendation;

import com.cinebooking.movie.MovieDtos.MovieResponse;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public final class RecommendationDtos {
    private RecommendationDtos() {}

    public record RecommendationScoreComponent(
            String key,
            String label,
            double contribution,
            String evidence
    ) {}

    public record RecommendationItem(
            MovieResponse movie,
            double score,
            int confidence,
            String reason,
            List<String> matchedGenres,
            List<String> signals,
            String feedback,
            boolean newToYou,
            List<RecommendationScoreComponent> scoreBreakdown
    ) {}

    public record TasteGenre(String name, double score) {}
    public record TasteFacet(String name, double score) {}

    public record RecommendationTasteProfile(
            String algorithmVersion,
            boolean personalized,
            String summary,
            List<TasteGenre> topGenres,
            List<TasteFacet> topLanguages,
            UUID preferredCinemaId,
            String preferredCinemaName,
            String preferredDaypart,
            String preferredDaypartLabel,
            Integer preferredWeekday,
            String preferredWeekdayLabel,
            String preferredDurationBand,
            String preferredDurationLabel,
            int profileStrength,
            int signalCount,
            long feedbackCount,
            long hiddenCount
    ) {}

    public record RecommendationHomeResponse(
            String algorithmVersion,
            String mode,
            boolean personalized,
            String profileSummary,
            RecommendationTasteProfile profile,
            List<RecommendationItem> personalizedMovies,
            List<RecommendationItem> trendingMovies
    ) {}

    public record RecommendationEventRequest(
            @NotNull UUID movieId,
            @NotBlank @Pattern(regexp = "CLICK|VIEW") String eventType,
            @Size(max = 60) String source
    ) {}

    public record RecommendationFeedbackRequest(
            @NotNull UUID movieId,
            @NotBlank @Pattern(regexp = "MORE_LIKE_THIS|LESS_LIKE_THIS|HIDE") String feedbackType,
            @Size(max = 60) String source
    ) {}

    public record RecommendationFeedbackResponse(
            UUID movieId,
            String feedbackType,
            String message
    ) {}
}
