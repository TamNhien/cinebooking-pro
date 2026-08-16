package com.cinebooking.recommendation;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.AppUser;
import com.cinebooking.domain.Cinema;
import com.cinebooking.domain.Movie;
import com.cinebooking.movie.CinemaRepository;
import com.cinebooking.movie.MovieRepository;
import com.cinebooking.movie.MovieService;
import com.cinebooking.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

import static com.cinebooking.recommendation.RecommendationDtos.*;

@Service
public class RecommendationService {
    private static final String VERSION = "V25-CONTENT-HYBRID-1";

    private final MovieRepository movies;
    private final MovieService movieService;
    private final UserRepository users;
    private final CinemaRepository cinemas;
    private final JdbcTemplate jdbc;

    public RecommendationService(MovieRepository movies, MovieService movieService, UserRepository users,
                                 CinemaRepository cinemas, JdbcTemplate jdbc) {
        this.movies = movies;
        this.movieService = movieService;
        this.users = users;
        this.cinemas = cinemas;
        this.jdbc = jdbc;
    }

    public RecommendationHomeResponse home(String email, UUID cinemaId, int requestedLimit) {
        int limit = Math.max(1, Math.min(requestedLimit, 20));
        List<RecommendationItem> trending = trending(cinemaId, limit);
        if (email == null || email.isBlank() || "anonymousUser".equals(email)) {
            return new RecommendationHomeResponse(VERSION, false,
                    "Đăng nhập để CineBooking học từ phim bạn yêu thích, đã xem và đánh giá.",
                    List.of(), trending);
        }

        AppUser user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Không tìm thấy tài khoản"));
        PersonalProfile profile = personalProfile(user.getId());
        List<RecommendationItem> personalized = personalized(user.getId(), cinemaId, limit, profile, trending);
        boolean hasSignals = !profile.genreWeights.isEmpty();
        String summary = hasSignals
                ? "Ưu tiên " + profile.topGenres(3) + " từ lịch sử đặt vé, yêu thích, đánh giá và lượt xem gợi ý."
                : "Bạn chưa có đủ lịch sử; CineBooking đang dùng xu hướng để giúp bạn khám phá phim mới.";
        return new RecommendationHomeResponse(VERSION, hasSignals, summary, personalized, trending);
    }

    public List<RecommendationItem> trending(UUID cinemaId, int requestedLimit) {
        int limit = Math.max(1, Math.min(requestedLimit, 20));
        List<Movie> candidates = candidates(cinemaId);
        Map<UUID, Popularity> popularity = popularity(candidates.stream().map(Movie::getId).toList());
        String cinemaName = cinemaId == null ? null : cinemas.findById(cinemaId).map(Cinema::getName)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy rạp"));

        return candidates.stream()
                .map(movie -> {
                    Popularity p = popularity.getOrDefault(movie.getId(), Popularity.ZERO);
                    double score = popularityScore(movie, p);
                    String reason = cinemaName == null
                            ? trendReason(p)
                            : "Đang được quan tâm tại " + cinemaName;
                    return item(movie, score, reason, List.of());
                })
                .sorted(Comparator.comparingDouble(RecommendationItem::score).reversed()
                        .thenComparing(x -> x.movie().title()))
                .limit(limit)
                .toList();
    }

    public List<RecommendationItem> similar(UUID movieId, int requestedLimit) {
        int limit = Math.max(1, Math.min(requestedLimit, 12));
        Movie target = movies.findById(movieId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phim"));
        Set<String> targetGenres = genres(target);
        List<Movie> candidates = movies.findByActiveTrueOrderByCreatedAtDesc().stream()
                .filter(m -> !m.getId().equals(movieId)).toList();
        Map<UUID, Popularity> popularity = popularity(candidates.stream().map(Movie::getId).toList());

        return candidates.stream().map(movie -> {
                    List<String> matched = displayMatchedGenres(target, movie);
                    Popularity p = popularity.getOrDefault(movie.getId(), Popularity.ZERO);
                    double score = matched.size() * 12.0 + popularityScore(movie, p) * 0.45;
                    if (Objects.equals(normalize(target.getRating()), normalize(movie.getRating()))) score += 1.0;
                    String reason = !matched.isEmpty()
                            ? "Cùng thể loại " + String.join(", ", matched)
                            : "Khán giả CineBooking cũng đang quan tâm";
                    return item(movie, score, reason, matched);
                })
                .sorted(Comparator.comparingDouble(RecommendationItem::score).reversed()
                        .thenComparing(x -> x.movie().title()))
                .limit(limit)
                .toList();
    }

    @Transactional
    public void recordEvent(String email, RecommendationEventRequest request) {
        AppUser user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Không tìm thấy tài khoản"));
        if (!movies.existsById(request.movieId())) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phim");
        }
        String source = request.source() == null ? null : request.source().trim();
        jdbc.update("insert into recommendation_event(id,user_id,movie_id,event_type,source,created_at) values (?,?,?,?,?,current_timestamp)",
                UUID.randomUUID(), user.getId(), request.movieId(), request.eventType().toUpperCase(Locale.ROOT), source);
    }

    private List<RecommendationItem> personalized(UUID userId, UUID cinemaId, int limit,
                                                  PersonalProfile profile, List<RecommendationItem> trendingFallback) {
        List<Movie> candidates = candidates(cinemaId);
        if (profile.genreWeights.isEmpty()) {
            return trendingFallback.stream()
                    .map(x -> new RecommendationItem(x.movie(), x.score(),
                            "Gợi ý khám phá dựa trên xu hướng CineBooking", x.matchedGenres()))
                    .limit(limit).toList();
        }

        Map<UUID, Popularity> popularity = popularity(candidates.stream().map(Movie::getId).toList());
        List<RecommendationItem> ranked = candidates.stream().map(movie -> {
                    Set<String> movieGenres = genres(movie);
                    List<String> matched = movieGenres.stream()
                            .filter(profile.genreWeights::containsKey)
                            .sorted(Comparator.comparingDouble((String g) -> profile.genreWeights.getOrDefault(g, 0.0)).reversed())
                            .map(profile.genreLabels::get)
                            .filter(Objects::nonNull)
                            .limit(3)
                            .toList();
                    double affinity = movieGenres.stream().mapToDouble(g -> profile.genreWeights.getOrDefault(g, 0.0)).sum();
                    Popularity p = popularity.getOrDefault(movie.getId(), Popularity.ZERO);
                    double score = affinity * 2.6 + popularityScore(movie, p) * 0.30;
                    if (profile.favoriteMovies.contains(movie.getId())) score -= 2.0;
                    if (profile.bookedMovies.contains(movie.getId())) score -= 2.5;
                    if (profile.positivelyReviewedMovies.contains(movie.getId())) score -= 3.0;
                    String reason = !matched.isEmpty()
                            ? "Vì bạn quan tâm " + String.join(", ", matched)
                            : trendReason(p);
                    return item(movie, score, reason, matched);
                })
                .sorted(Comparator.comparingDouble(RecommendationItem::score).reversed()
                        .thenComparing(x -> x.movie().title()))
                .limit(limit).toList();

        if (ranked.size() >= limit) return ranked;
        LinkedHashMap<UUID, RecommendationItem> merged = new LinkedHashMap<>();
        ranked.forEach(x -> merged.put(x.movie().id(), x));
        trendingFallback.forEach(x -> merged.putIfAbsent(x.movie().id(), x));
        return merged.values().stream().limit(limit).toList();
    }

    private PersonalProfile personalProfile(UUID userId) {
        List<Movie> all = movies.findAll();
        Map<UUID, Movie> byId = all.stream().collect(Collectors.toMap(Movie::getId, m -> m));
        PersonalProfile profile = new PersonalProfile();

        jdbc.query("select movie_id from movie_favorite where user_id=?", rs -> {
            UUID movieId = rs.getObject(1, UUID.class);
            profile.favoriteMovies.add(movieId);
            addMovieGenres(profile, byId.get(movieId), 5.0);
        }, userId);

        jdbc.query("select movie_id,rating from movie_review where user_id=?", rs -> {
            UUID movieId = rs.getObject(1, UUID.class);
            int rating = rs.getInt(2);
            if (rating >= 4) {
                profile.positivelyReviewedMovies.add(movieId);
                addMovieGenres(profile, byId.get(movieId), rating == 5 ? 5.0 : 3.5);
            }
        }, userId);

        jdbc.query("select st.movie_id,count(*) from booking b join showtime st on st.id=b.showtime_id where b.user_id=? and b.status='CONFIRMED' group by st.movie_id", rs -> {
            UUID movieId = rs.getObject(1, UUID.class);
            long count = rs.getLong(2);
            profile.bookedMovies.add(movieId);
            addMovieGenres(profile, byId.get(movieId), 4.0 * Math.min(count, 3));
        }, userId);

        jdbc.query("select movie_id,count(*) from recommendation_event where user_id=? and event_type in ('CLICK','VIEW') and created_at>=now()-interval '90 days' group by movie_id", rs -> {
            UUID movieId = rs.getObject(1, UUID.class);
            long count = rs.getLong(2);
            addMovieGenres(profile, byId.get(movieId), 1.25 * Math.min(count, 4));
        }, userId);

        return profile;
    }

    private void addMovieGenres(PersonalProfile profile, Movie movie, double weight) {
        if (movie == null) return;
        for (GenrePart part : genreParts(movie.getGenre())) {
            profile.genreWeights.merge(part.key, weight, Double::sum);
            profile.genreLabels.putIfAbsent(part.key, part.label);
        }
    }

    private List<Movie> candidates(UUID cinemaId) {
        List<Movie> active = movies.findByActiveTrueOrderByCreatedAtDesc();
        if (cinemaId == null) return active;
        if (!cinemas.existsById(cinemaId)) throw new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy rạp");
        Set<UUID> availableMovieIds = new HashSet<>(jdbc.queryForList(
                "select distinct st.movie_id from showtime st join auditorium a on a.id=st.auditorium_id where a.cinema_id=? and st.status='OPEN' and st.start_time>now()",
                UUID.class, cinemaId));
        return active.stream().filter(m -> availableMovieIds.contains(m.getId())).toList();
    }

    private Map<UUID, Popularity> popularity(List<UUID> movieIds) {
        Map<UUID, Popularity> result = new HashMap<>();
        if (movieIds.isEmpty()) return result;
        jdbc.query("""
                select m.id,
                       coalesce((select count(*) from booking b join showtime st on st.id=b.showtime_id where st.movie_id=m.id and b.status='CONFIRMED' and b.confirmed_at>=now()-interval '30 days'),0) bookings_30d,
                       coalesce((select count(*) from movie_favorite mf where mf.movie_id=m.id),0) favorites,
                       coalesce((select count(*) from movie_review mr where mr.movie_id=m.id),0) reviews,
                       coalesce((select avg(mr.rating) from movie_review mr where mr.movie_id=m.id),0) avg_rating,
                       coalesce((select count(*) from showtime st where st.movie_id=m.id and st.status='OPEN' and st.start_time>now()),0) upcoming
                from movie m where m.active=true
                """, rs -> {
            Popularity p = mapPopularity(rs);
            result.put(rs.getObject("id", UUID.class), p);
        });
        result.keySet().retainAll(new HashSet<>(movieIds));
        return result;
    }

    private Popularity mapPopularity(ResultSet rs) throws SQLException {
        return new Popularity(rs.getLong("bookings_30d"), rs.getLong("favorites"), rs.getLong("reviews"),
                rs.getDouble("avg_rating"), rs.getLong("upcoming"));
    }

    private double popularityScore(Movie movie, Popularity p) {
        double score = p.bookings30d * 5.0 + p.favorites * 2.0 + p.reviews * 0.7 + p.avgRating * 1.4 + Math.min(p.upcoming, 10) * 0.25;
        if (movie.getReleaseDate() != null && !movie.getReleaseDate().isBefore(LocalDate.now().minusDays(60))) score += 2.5;
        return Math.round(score * 100.0) / 100.0;
    }

    private String trendReason(Popularity p) {
        if (p.bookings30d > 0) return "Được đặt nhiều trong 30 ngày gần đây";
        if (p.favorites > 0) return "Được nhiều thành viên yêu thích";
        if (p.reviews > 0) return "Được cộng đồng đánh giá tích cực";
        return "Phim đang có lịch chiếu tại CineBooking";
    }

    private RecommendationItem item(Movie movie, double score, String reason, List<String> matchedGenres) {
        return new RecommendationItem(movieService.movieDto(movie), Math.round(score * 100.0) / 100.0, reason, matchedGenres);
    }

    private Set<String> genres(Movie movie) {
        return genreParts(movie.getGenre()).stream().map(g -> g.key).collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private List<String> displayMatchedGenres(Movie leftMovie, Movie rightMovie) {
        Map<String, String> labels = new LinkedHashMap<>();
        for (GenrePart p : genreParts(leftMovie.getGenre())) labels.putIfAbsent(p.key, p.label);
        for (GenrePart p : genreParts(rightMovie.getGenre())) labels.putIfAbsent(p.key, p.label);
        Set<String> right = genres(rightMovie);
        return genres(leftMovie).stream().filter(right::contains).map(labels::get).filter(Objects::nonNull).limit(3).toList();
    }

    private List<GenrePart> genreParts(String value) {
        if (value == null || value.isBlank()) return List.of();
        return Arrays.stream(value.split("[,;/|]"))
                .map(String::trim).filter(x -> !x.isBlank())
                .map(x -> new GenrePart(normalize(x), x))
                .distinct().toList();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private record GenrePart(String key, String label) {}
    private record Popularity(long bookings30d, long favorites, long reviews, double avgRating, long upcoming) {
        static final Popularity ZERO = new Popularity(0, 0, 0, 0, 0);
    }

    private static final class PersonalProfile {
        final Map<String, Double> genreWeights = new HashMap<>();
        final Map<String, String> genreLabels = new HashMap<>();
        final Set<UUID> favoriteMovies = new HashSet<>();
        final Set<UUID> bookedMovies = new HashSet<>();
        final Set<UUID> positivelyReviewedMovies = new HashSet<>();

        String topGenres(int limit) {
            return genreWeights.entrySet().stream()
                    .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                    .limit(limit)
                    .map(e -> genreLabels.getOrDefault(e.getKey(), e.getKey()))
                    .collect(Collectors.joining(", "));
        }
    }
}
