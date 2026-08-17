package com.cinebooking.booking;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.Auditorium;
import com.cinebooking.domain.Cinema;
import com.cinebooking.domain.Movie;
import com.cinebooking.domain.Showtime;
import com.cinebooking.movie.AuditoriumRepository;
import com.cinebooking.movie.CinemaRepository;
import com.cinebooking.movie.MovieRepository;
import com.cinebooking.movie.ShowtimeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BookingCalendarService {
    private final BookingService bookings;
    private final ShowtimeRepository showtimes;
    private final MovieRepository movies;
    private final AuditoriumRepository auditoriums;
    private final CinemaRepository cinemas;

    public BookingCalendarService(BookingService bookings, ShowtimeRepository showtimes, MovieRepository movies,
                                  AuditoriumRepository auditoriums, CinemaRepository cinemas) {
        this.bookings = bookings;
        this.showtimes = showtimes;
        this.movies = movies;
        this.auditoriums = auditoriums;
        this.cinemas = cinemas;
    }

    public CalendarFile create(UUID bookingId, String email) {
        var booking = bookings.getOwned(bookingId, email);
        if (!"CONFIRMED".equals(booking.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "Chỉ vé đã thanh toán và xác nhận mới có thể thêm vào lịch");
        }

        Showtime showtime = showtimes.findById(booking.showtimeId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy suất chiếu"));
        Movie movie = movies.findById(showtime.getMovieId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phim"));
        Auditorium auditorium = auditoriums.findById(showtime.getAuditoriumId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng chiếu"));
        Cinema cinema = cinemas.findById(auditorium.getCinemaId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy rạp"));

        Instant start = showtime.getStartTime();
        int duration = movie.getDurationMinutes() == null ? 120 : Math.max(1, movie.getDurationMinutes());
        Instant end = start.plusSeconds(duration * 60L);
        String seats = booking.seats().stream().map(BookingDtos.BookingSeatResponse::code).collect(Collectors.joining(", "));
        String location = cinema.getName() + " - " + auditorium.getName() + ", " + cinema.getAddress();
        String description = "Booking #" + booking.id() + " | Ghế " + seats + " | CineBooking Pro";

        String ics = IcsCalendarBuilder.build(booking.id(), movie.getTitle(), start, end, location, description, Instant.now());
        return new CalendarFile("cinebooking-" + booking.id() + ".ics", ics);
    }

    public record CalendarFile(String filename, String content) {}
}
