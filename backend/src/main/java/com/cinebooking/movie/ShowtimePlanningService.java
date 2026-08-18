package com.cinebooking.movie;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.Movie;
import com.cinebooking.domain.Showtime;
import com.cinebooking.domain.ShowtimeStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

import static com.cinebooking.movie.AdminCatalogDtos.*;
import static com.cinebooking.movie.MovieDtos.ShowtimeResponse;

@Service
public class ShowtimePlanningService {
    private static final int MAX_PLAN_DAYS = 62;
    private static final int MAX_START_TIMES = 12;
    private static final int MAX_PLAN_SLOTS = 500;

    private final MovieRepository movies;
    private final AuditoriumRepository auditoriums;
    private final ShowtimeRepository showtimes;
    private final MovieService movieService;
    private final long turnaroundMinutes;
    private final ZoneId zone;

    public ShowtimePlanningService(MovieRepository movies,
                                   AuditoriumRepository auditoriums,
                                   ShowtimeRepository showtimes,
                                   MovieService movieService,
                                   @Value("${app.showtime.turnaround-minutes:15}") long turnaroundMinutes,
                                   @Value("${app.showtime.zone:Asia/Ho_Chi_Minh}") String zoneId) {
        this.movies = movies;
        this.auditoriums = auditoriums;
        this.showtimes = showtimes;
        this.movieService = movieService;
        this.turnaroundMinutes = Math.max(0, turnaroundMinutes);
        this.zone = ZoneId.of(zoneId);
    }

    @Transactional(readOnly = true)
    public ShowtimePlanPreview preview(ShowtimePlanRequest request) {
        ValidatedPlan plan = validate(request, false);
        return buildPreview(plan, showtimes.findByAuditoriumIdOrderByStartTimeAsc(request.auditoriumId()));
    }

    @Transactional
    public ShowtimePlanCommitResponse commit(ShowtimePlanRequest request) {
        ValidatedPlan plan = validate(request, true);
        ShowtimePlanPreview preview = buildPreview(plan, showtimes.findByAuditoriumIdOrderByStartTimeAsc(request.auditoriumId()));
        if (preview.conflicts() > 0 && !request.skipConflicts()) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Kế hoạch có " + preview.conflicts() + " khung giờ trùng lịch. Hãy preview và xử lý xung đột hoặc bật bỏ qua khung giờ trùng.");
        }

        Map<Instant, ShowtimePlanSlot> byStart = preview.slots().stream()
                .collect(Collectors.toMap(ShowtimePlanSlot::startTime, s -> s, (a, b) -> a, LinkedHashMap::new));
        List<Showtime> created = new ArrayList<>();
        for (Instant start : plan.starts()) {
            ShowtimePlanSlot slot = byStart.get(start);
            if (slot == null || !slot.creatable()) continue;
            Showtime s = new Showtime();
            s.setMovieId(request.movieId());
            s.setAuditoriumId(request.auditoriumId());
            s.setStartTime(start);
            s.setBasePrice(request.basePrice());
            s.setStatus(plan.status());
            created.add(s);
        }
        List<ShowtimeResponse> saved = showtimes.saveAll(created).stream().map(movieService::showtimeDto).toList();
        return new ShowtimePlanCommitResponse(saved.size(), preview.conflicts(), preview, saved);
    }

    @Transactional
    public void requireNoConflict(UUID ignoreShowtimeId, UUID movieId, UUID auditoriumId, Instant startTime, String statusText) {
        ShowtimeStatus status = parseStatus(statusText);
        if (status == ShowtimeStatus.CANCELLED) return;
        Movie movie = movies.findById(movieId).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "movieId không tồn tại"));
        auditoriums.findByIdForUpdate(auditoriumId).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "auditoriumId không tồn tại"));

        Instant end = endTime(startTime, movie.getDurationMinutes());
        Map<UUID, Movie> movieMap = movieMap();
        for (Showtime existing : showtimes.findByAuditoriumIdOrderByStartTimeAsc(auditoriumId)) {
            if (Objects.equals(existing.getId(), ignoreShowtimeId) || existing.getStatus() == ShowtimeStatus.CANCELLED) continue;
            Movie existingMovie = movieMap.get(existing.getMovieId());
            if (existingMovie == null) continue;
            Instant existingEnd = endTime(existing.getStartTime(), existingMovie.getDurationMinutes());
            if (overlaps(startTime, end, existing.getStartTime(), existingEnd)) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Trùng lịch phòng với " + existingMovie.getTitle() + " lúc " + local(existing.getStartTime())
                                + ". Mỗi suất cần thêm " + turnaroundMinutes + " phút thời gian dọn phòng.");
            }
        }
    }

    private ValidatedPlan validate(ShowtimePlanRequest request, boolean lockAuditorium) {
        Movie movie = movies.findById(request.movieId()).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "movieId không tồn tại"));
        if (lockAuditorium) {
            auditoriums.findByIdForUpdate(request.auditoriumId()).orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "auditoriumId không tồn tại"));
        } else if (!auditoriums.existsById(request.auditoriumId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "auditoriumId không tồn tại");
        }
        if (request.toDate().isBefore(request.fromDate())) throw new ApiException(HttpStatus.BAD_REQUEST, "toDate phải từ fromDate trở đi");
        long days = Duration.between(request.fromDate().atStartOfDay(), request.toDate().plusDays(1).atStartOfDay()).toDays();
        if (days > MAX_PLAN_DAYS) throw new ApiException(HttpStatus.BAD_REQUEST, "Mỗi lần chỉ được lập lịch tối đa " + MAX_PLAN_DAYS + " ngày");
        LinkedHashSet<LocalTime> times = new LinkedHashSet<>(request.startTimes());
        if (times.isEmpty() || times.size() > MAX_START_TIMES) throw new ApiException(HttpStatus.BAD_REQUEST, "Cần từ 1 đến " + MAX_START_TIMES + " khung giờ/ngày");
        List<LocalTime> sortedTimes = times.stream().sorted().toList();
        int slotCount = Math.toIntExact(days * sortedTimes.size());
        if (slotCount > MAX_PLAN_SLOTS) throw new ApiException(HttpStatus.BAD_REQUEST, "Kế hoạch vượt quá " + MAX_PLAN_SLOTS + " suất/lần");
        ShowtimeStatus status = parseStatus(request.status());
        if (status == ShowtimeStatus.CANCELLED) throw new ApiException(HttpStatus.BAD_REQUEST, "Không tạo lịch hàng loạt ở trạng thái CANCELLED");

        List<Instant> starts = new ArrayList<>(slotCount);
        for (LocalDate date = request.fromDate(); !date.isAfter(request.toDate()); date = date.plusDays(1)) {
            for (LocalTime time : sortedTimes) starts.add(ZonedDateTime.of(date, time, zone).toInstant());
        }
        return new ValidatedPlan(movie, status, starts);
    }

    private ShowtimePlanPreview buildPreview(ValidatedPlan plan, List<Showtime> existing) {
        Map<UUID, Movie> movieMap = movieMap();
        List<ShowtimePlanSlot> slots = new ArrayList<>();
        List<PlannedWindow> accepted = new ArrayList<>();

        for (Instant start : plan.starts()) {
            Instant end = endTime(start, plan.movie().getDurationMinutes());
            Showtime conflict = null;
            Movie conflictMovie = null;
            for (Showtime s : existing) {
                if (s.getStatus() == ShowtimeStatus.CANCELLED) continue;
                Movie m = movieMap.get(s.getMovieId());
                if (m == null) continue;
                if (overlaps(start, end, s.getStartTime(), endTime(s.getStartTime(), m.getDurationMinutes()))) {
                    conflict = s;
                    conflictMovie = m;
                    break;
                }
            }

            String conflictLabel = null;
            UUID conflictId = null;
            if (conflict != null) {
                conflictId = conflict.getId();
                conflictLabel = conflictMovie.getTitle() + " · " + local(conflict.getStartTime());
            } else {
                PlannedWindow internal = accepted.stream().filter(w -> overlaps(start, end, w.start(), w.end())).findFirst().orElse(null);
                if (internal != null) conflictLabel = "Khung mới cùng batch · " + local(internal.start());
            }

            boolean creatable = conflictLabel == null;
            slots.add(new ShowtimePlanSlot(start, end, creatable, conflictId, conflictLabel));
            if (creatable) accepted.add(new PlannedWindow(start, end));
        }
        long conflicts = slots.stream().filter(s -> !s.creatable()).count();
        return new ShowtimePlanPreview(zone.getId(), turnaroundMinutes, slots.size(), slots.size() - (int) conflicts, (int) conflicts, slots);
    }

    private Map<UUID, Movie> movieMap() {
        return movies.findAll().stream().collect(Collectors.toMap(Movie::getId, m -> m));
    }

    private ShowtimeStatus parseStatus(String value) {
        try { return ShowtimeStatus.valueOf(value.trim().toUpperCase(Locale.ROOT)); }
        catch (Exception e) { throw new ApiException(HttpStatus.BAD_REQUEST, "status suất chiếu không hợp lệ"); }
    }

    private Instant endTime(Instant start, int movieMinutes) {
        return start.plus(Duration.ofMinutes((long) movieMinutes + turnaroundMinutes));
    }

    static boolean overlaps(Instant aStart, Instant aEnd, Instant bStart, Instant bEnd) {
        return aStart.isBefore(bEnd) && aEnd.isAfter(bStart);
    }

    private String local(Instant instant) {
        return DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(zone).format(instant);
    }

    private record ValidatedPlan(Movie movie, ShowtimeStatus status, List<Instant> starts) {}
    private record PlannedWindow(Instant start, Instant end) {}
}
