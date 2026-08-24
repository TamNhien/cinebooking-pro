package com.cinebooking.movie;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.engagement.MovieEngagementService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static com.cinebooking.movie.MovieDtos.*;

@Service
public class MovieService {
    private final MovieRepository movies;
    private final ShowtimeRepository showtimes;
    private final AuditoriumRepository auditoriums;
    private final CinemaRepository cinemas;
    private final MovieEngagementService engagement;

    public MovieService(MovieRepository movies, ShowtimeRepository showtimes, AuditoriumRepository auditoriums, CinemaRepository cinemas, MovieEngagementService engagement) {
        this.movies=movies; this.showtimes=showtimes; this.auditoriums=auditoriums; this.cinemas=cinemas; this.engagement=engagement;
    }

    public List<MovieResponse> listMovies() { return movies.findByActiveTrueOrderByCreatedAtDesc().stream().map(this::movieDto).toList(); }
    public MovieResponse getMovie(UUID id) { return movieDto(movies.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy phim"))); }
    public List<CinemaPublicResponse> listCinemas() { return cinemas.findAllByOrderByNameAsc().stream().map(c -> new CinemaPublicResponse(c.getId(), c.getName(), c.getAddress())).toList(); }

    public List<ShowtimeResponse> listShowtimes(UUID movieId) {
        List<Showtime> list = movieId == null
                ? showtimes.findByStatusAndStartTimeAfterOrderByStartTimeAsc(ShowtimeStatus.OPEN, Instant.now())
                : showtimes.findByMovieIdAndStatusAndStartTimeAfterOrderByStartTimeAsc(movieId, ShowtimeStatus.OPEN, Instant.now());
        return list.stream().map(this::showtimeDto).toList();
    }

    public ShowtimeResponse getShowtime(UUID id) {
        return showtimeDto(showtimes.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy suất chiếu")));
    }

    @Transactional
    public MovieResponse createMovie(CreateMovieRequest req) {
        Movie m = new Movie(); m.setTitle(req.title()); m.setDescription(req.description()); m.setDurationMinutes(req.durationMinutes());
        m.setPosterUrl(req.posterUrl()); m.setRating(req.rating()); m.setReleaseDate(req.releaseDate()); m.setActive(true);
        return movieDto(movies.save(m));
    }

    @Transactional
    public ShowtimeResponse createShowtime(CreateShowtimeRequest req) {
        if (!movies.existsById(req.movieId())) throw new ApiException(HttpStatus.BAD_REQUEST,"movieId không tồn tại");
        if (!auditoriums.existsById(req.auditoriumId())) throw new ApiException(HttpStatus.BAD_REQUEST,"auditoriumId không tồn tại");
        Showtime s = new Showtime(); s.setMovieId(req.movieId()); s.setAuditoriumId(req.auditoriumId()); s.setStartTime(req.startTime());
        s.setBasePrice(req.basePrice()); s.setStatus(ShowtimeStatus.OPEN); return showtimeDto(showtimes.save(s));
    }

    public MovieResponse movieDto(Movie m) { return new MovieResponse(m.getId(),m.getTitle(),m.getDescription(),m.getDurationMinutes(),m.getPosterUrl(),m.getRating(),m.getGenre(),m.getLanguage(),m.getTrailerUrl(),m.getReleaseDate(),Boolean.TRUE.equals(m.getActive()),engagement.average(m.getId()),engagement.count(m.getId())); }
    public ShowtimeResponse showtimeDto(Showtime s) {
        Movie m = movies.findById(s.getMovieId()).orElseThrow();
        Auditorium a = auditoriums.findById(s.getAuditoriumId()).orElseThrow();
        Cinema c = cinemas.findById(a.getCinemaId()).orElseThrow();
        return new ShowtimeResponse(s.getId(),s.getMovieId(),m.getTitle(),s.getAuditoriumId(),a.getName(),c.getId(),c.getName(),c.getAddress(),s.getStartTime(),s.getBasePrice(),s.getStatus().name(),s.getPlanningSource(),s.getPlanningRunId(),s.getPlanningScore());
    }
}
