package com.cinebooking.movie;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
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
}
