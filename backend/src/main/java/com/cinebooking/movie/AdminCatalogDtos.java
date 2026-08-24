package com.cinebooking.movie;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;
import java.util.List;

public final class AdminCatalogDtos {
    private AdminCatalogDtos(){}
    public record AdminMovieRequest(@NotBlank @Size(max=200) String title, String description, @NotNull @Min(1) Integer durationMinutes,
                                    String posterUrl, @Size(max=20) String rating, @Size(max=200) String genre, @Size(max=80) String language, String trailerUrl, LocalDate releaseDate, @NotNull Boolean active) {}
    public record CinemaResponse(UUID id,String name,String address){}
    public record CinemaRequest(@NotBlank @Size(max=160) String name,@NotBlank @Size(max=300) String address){}
    public record AuditoriumResponse(UUID id,UUID cinemaId,String cinemaName,String name){}
    public record AuditoriumRequest(@NotNull UUID cinemaId,@NotBlank @Size(max=100) String name){}
    public record SeatAdminResponse(UUID id,UUID auditoriumId,String auditoriumName,String rowLabel,Integer seatNumber,String seatType,BigDecimal priceModifier){}
    public record SeatAdminRequest(@NotNull UUID auditoriumId,@NotBlank @Size(max=8) String rowLabel,@NotNull @Min(1) Integer seatNumber,
                                   @NotBlank String seatType,@NotNull @DecimalMin("0.0") BigDecimal priceModifier){}
    public record SeatLayoutCell(@NotBlank @Size(max=8) String rowLabel,@NotNull @Min(1) Integer seatNumber,@NotBlank String seatType,@NotNull @DecimalMin("0.0") BigDecimal priceModifier){}
    public record SeatLayoutRequest(@NotEmpty @Size(max=500) @Valid List<SeatLayoutCell> seats){}
    public record ShowtimeAdminRequest(@NotNull UUID movieId,@NotNull UUID auditoriumId,@NotNull Instant startTime,
                                       @NotNull @DecimalMin("0.0") BigDecimal basePrice,@NotBlank String status){}
    public record ShowtimePlanRequest(@NotNull UUID movieId,@NotNull UUID auditoriumId,@NotNull LocalDate fromDate,@NotNull LocalDate toDate,
                                      @NotEmpty @Size(max=12) List<@NotNull LocalTime> startTimes,@NotNull @DecimalMin("0.0") BigDecimal basePrice,
                                      @NotBlank String status,@NotNull Boolean skipConflicts){}
    public record ShowtimePlanSlot(Instant startTime,Instant endTime,boolean creatable,String conflictType,UUID conflictShowtimeId,UUID conflictBlackoutId,String conflictLabel){}
    public record ShowtimePlanPreview(String zoneId,long turnaroundMinutes,int requested,int creatable,int conflicts,List<ShowtimePlanSlot> slots){}
    public record ShowtimePlanCommitResponse(int created,int skipped,ShowtimePlanPreview preview,List<com.cinebooking.movie.MovieDtos.ShowtimeResponse> showtimes){}

    // V49 Smart Showtime Planning 2.0
    public record SmartShowtimePlanRequest(@NotNull UUID cinemaId,@NotNull UUID movieId,@NotNull LocalDate fromDate,@NotNull LocalDate toDate,
                                           @NotNull @Min(1) @Max(12) Integer targetPerDay,@NotNull LocalTime operatingStart,@NotNull LocalTime operatingEnd,
                                           @NotNull @Min(15) @Max(120) Integer intervalMinutes,@NotNull @DecimalMin("0.0") BigDecimal basePrice,
                                           @NotBlank String status){}
    public record SmartShowtimeSlot(UUID auditoriumId,String auditoriumName,Instant startTime,Instant endTime,double score,
                                    double historicalOccupancy,int historicalSamples,List<String> reasons){}
    public record SmartShowtimeDay(LocalDate date,int target,int suggested,int conflicts,int candidateCount,List<SmartShowtimeSlot> slots){}
    public record SmartShowtimePlanPreview(String strategyVersion,String zoneId,long turnaroundMinutes,long minMovieSpacingMinutes,
                                           UUID cinemaId,String cinemaName,UUID movieId,String movieTitle,int requested,int suggested,
                                           int conflicts,int candidateCount,int historicalSamples,List<SmartShowtimeDay> days){}
    public record SmartShowtimeCommitResponse(UUID planningRunId,int created,SmartShowtimePlanPreview preview,
                                              List<com.cinebooking.movie.MovieDtos.ShowtimeResponse> showtimes){}
    public record ShowtimePlanningRunResponse(UUID id,UUID cinemaId,String cinemaName,UUID movieId,String movieTitle,LocalDate fromDate,LocalDate toDate,
                                              int targetPerDay,LocalTime operatingStart,LocalTime operatingEnd,int intervalMinutes,BigDecimal basePrice,
                                              int requestedSlots,int suggestedSlots,int conflictCount,int historicalSamples,String strategy,String status,
                                              String createdBy,Instant createdAt,Instant committedAt){}

    public record AuditoriumBlackoutRequest(@NotNull UUID auditoriumId,@NotNull Instant startTime,@NotNull Instant endTime,@NotBlank @Size(max=300) String reason){}
    public record AuditoriumBlackoutResponse(UUID id,UUID auditoriumId,String cinemaName,String auditoriumName,Instant startTime,Instant endTime,String reason,Instant createdAt){}
}
