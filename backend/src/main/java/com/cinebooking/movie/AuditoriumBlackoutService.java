package com.cinebooking.movie;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.Auditorium;
import com.cinebooking.domain.AuditoriumBlackout;
import com.cinebooking.domain.Movie;
import com.cinebooking.domain.Showtime;
import com.cinebooking.domain.ShowtimeStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static com.cinebooking.movie.AdminCatalogDtos.*;

@Service
public class AuditoriumBlackoutService {
    private static final Duration MAX_BLACKOUT = Duration.ofDays(14);

    private final AuditoriumBlackoutRepository blackouts;
    private final AuditoriumRepository auditoriums;
    private final CinemaRepository cinemas;
    private final ShowtimeRepository showtimes;
    private final MovieRepository movies;
    private final long turnaroundMinutes;

    public AuditoriumBlackoutService(AuditoriumBlackoutRepository blackouts,
                                     AuditoriumRepository auditoriums,
                                     CinemaRepository cinemas,
                                     ShowtimeRepository showtimes,
                                     MovieRepository movies,
                                     @Value("${app.showtime.turnaround-minutes:15}") long turnaroundMinutes) {
        this.blackouts = blackouts;
        this.auditoriums = auditoriums;
        this.cinemas = cinemas;
        this.showtimes = showtimes;
        this.movies = movies;
        this.turnaroundMinutes = Math.max(0, turnaroundMinutes);
    }

    @Transactional(readOnly = true)
    public List<AuditoriumBlackoutResponse> list(UUID auditoriumId) {
        List<AuditoriumBlackout> items = auditoriumId == null
                ? blackouts.findAllByOrderByStartTimeAsc()
                : blackouts.findByAuditoriumIdOrderByStartTimeAsc(auditoriumId);
        Map<UUID, Auditorium> roomMap = auditoriums.findAll().stream().collect(Collectors.toMap(Auditorium::getId, a -> a));
        return items.stream().map(b -> response(b, roomMap.get(b.getAuditoriumId()))).toList();
    }

    @Transactional
    public AuditoriumBlackoutResponse create(AuditoriumBlackoutRequest request) {
        validateWindow(request.startTime(), request.endTime());
        Auditorium room = auditoriums.findByIdForUpdate(request.auditoriumId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "auditoriumId không tồn tại"));

        List<AuditoriumBlackout> overlapping = blackouts
                .findByAuditoriumIdAndEndTimeAfterAndStartTimeBeforeOrderByStartTimeAsc(request.auditoriumId(), request.startTime(), request.endTime());
        if (!overlapping.isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "Khoảng bảo trì bị trùng với một khoảng khóa phòng đã tồn tại");
        }

        Map<UUID, Movie> movieMap = movies.findAll().stream().collect(Collectors.toMap(Movie::getId, m -> m));
        for (Showtime showtime : showtimes.findByAuditoriumIdOrderByStartTimeAsc(request.auditoriumId())) {
            if (showtime.getStatus() == ShowtimeStatus.CANCELLED) continue;
            Movie movie = movieMap.get(showtime.getMovieId());
            if (movie == null) continue;
            Instant occupiedEnd = showtime.getStartTime().plus(Duration.ofMinutes((long) movie.getDurationMinutes() + turnaroundMinutes));
            if (ShowtimePlanningService.overlaps(request.startTime(), request.endTime(), showtime.getStartTime(), occupiedEnd)) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Không thể khóa phòng vì đang có suất " + movie.getTitle() + ". Hãy huỷ hoặc dời suất chiếu trước.");
            }
        }

        AuditoriumBlackout blackout = new AuditoriumBlackout();
        blackout.setAuditoriumId(request.auditoriumId());
        blackout.setStartTime(request.startTime());
        blackout.setEndTime(request.endTime());
        blackout.setReason(request.reason().trim());
        return response(blackouts.save(blackout), room);
    }

    @Transactional
    public void delete(UUID id) {
        AuditoriumBlackout blackout = blackouts.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Khoảng khóa phòng không tồn tại"));
        auditoriums.findByIdForUpdate(blackout.getAuditoriumId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Phòng chiếu không tồn tại"));
        blackouts.delete(blackout);
    }

    private void validateWindow(Instant start, Instant end) {
        if (!end.isAfter(start)) throw new ApiException(HttpStatus.BAD_REQUEST, "Thời gian kết thúc phải sau thời gian bắt đầu");
        if (Duration.between(start, end).compareTo(MAX_BLACKOUT) > 0)
            throw new ApiException(HttpStatus.BAD_REQUEST, "Mỗi khoảng khóa phòng tối đa 14 ngày");
    }

    private AuditoriumBlackoutResponse response(AuditoriumBlackout b, Auditorium room) {
        String roomName = room == null ? "Phòng đã xoá" : room.getName();
        String cinemaName = "Rạp không xác định";
        if (room != null) cinemaName = cinemas.findById(room.getCinemaId()).map(c -> c.getName()).orElse(cinemaName);
        return new AuditoriumBlackoutResponse(b.getId(), b.getAuditoriumId(), cinemaName, roomName,
                b.getStartTime(), b.getEndTime(), b.getReason(), b.getCreatedAt());
    }
}
