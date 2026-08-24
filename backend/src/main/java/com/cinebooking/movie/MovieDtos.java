package com.cinebooking.movie;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public final class MovieDtos {
    private MovieDtos() {}
    public record MovieResponse(UUID id, String title, String description, Integer durationMinutes, String posterUrl,
                                String rating, String genre, String language, String trailerUrl, LocalDate releaseDate, boolean active, double averageRating, long reviewCount) {}
    public record CinemaPublicResponse(UUID id, String name, String address) {}
    public record ShowtimeResponse(UUID id, UUID movieId, String movieTitle, UUID auditoriumId, String auditoriumName,
                                   UUID cinemaId, String cinemaName, String cinemaAddress, Instant startTime,
                                   BigDecimal basePrice, String status, String planningSource, UUID planningRunId, BigDecimal planningScore) {}
    public record CreateMovieRequest(@NotBlank String title, String description, @NotNull @Min(1) Integer durationMinutes,
                                     String posterUrl, String rating, LocalDate releaseDate) {}
    public record CreateShowtimeRequest(@NotNull UUID movieId, @NotNull UUID auditoriumId,
                                        @NotNull Instant startTime, @NotNull BigDecimal basePrice) {}
}
