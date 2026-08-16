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

    public record RecommendationItem(
            MovieResponse movie,
            double score,
            String reason,
            List<String> matchedGenres
    ) {}

    public record RecommendationHomeResponse(
            String algorithmVersion,
            boolean personalized,
            String profileSummary,
            List<RecommendationItem> personalizedMovies,
            List<RecommendationItem> trendingMovies
    ) {}

    public record RecommendationEventRequest(
            @NotNull UUID movieId,
            @NotBlank @Pattern(regexp = "CLICK|VIEW") String eventType,
            @Size(max = 60) String source
    ) {}
}
