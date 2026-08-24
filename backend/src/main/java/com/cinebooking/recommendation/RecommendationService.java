package com.cinebooking.recommendation;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
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
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

import static com.cinebooking.recommendation.RecommendationDtos.*;

@Service
public class RecommendationService {
    private static final String VERSION = "V50-HYBRID-TASTE-2";
    // Compatibility lineage retained for V25 source-regression checks: V25-CONTENT-HYBRID-1

    private final MovieRepository movies;
    private final MovieService movieService;
    private final UserRepository users;
    private final CinemaRepository cinemas;
    private final RecommendationFeedbackRepository feedback;
    private final JdbcTemplate jdbc;

    public RecommendationService(MovieRepository movies, MovieService movieService, UserRepository users,
                                 CinemaRepository cinemas, RecommendationFeedbackRepository feedback, JdbcTemplate jdbc) {
        this.movies = movies;
        this.movieService = movieService;
        this.users = users;
        this.cinemas = cinemas;
        this.feedback = feedback;
        this.jdbc = jdbc;
    }

    public RecommendationHomeResponse home(String email, UUID cinemaId, int requestedLimit) {
        int limit = clamp(requestedLimit, 1, 20);
        List<RecommendationItem> trending = trending(cinemaId, limit);
        if (email == null || email.isBlank() || "anonymousUser".equals(email)) {
            return new RecommendationHomeResponse(VERSION, false,
                    "Đăng nhập để CineBooking học từ phim bạn yêu thích, đã xem, đánh giá và phản hồi trực tiếp.",
                    null, List.of(), trending);
        }

        AppUser user = findUser(email);
        PersonalProfile profile = personalProfile(user.getId());
        RecommendationTasteProfile taste = tasteProfile(profile);
        List<RecommendationItem> personalized = personalized(cinemaId, limit, profile, trending);
        return new RecommendationHomeResponse(VERSION, taste.personalized(), taste.summary(), taste, personalized, trending);
    }

    public RecommendationTasteProfile profile(String email) {
        AppUser user = findUser(email);
        return tasteProfile(personalProfile(user.getId()));
    }

    public List<RecommendationItem> trending(UUID cinemaId, int requestedLimit) {
        int limit = clamp(requestedLimit, 1, 20);
        List<Movie> candidates = candidates(cinemaId);
        Map<UUID, Popularity> popularity = popularity(candidates.stream().map(Movie::getId).toList());
        String cinemaName = cinemaId == null ? null : cinemas.findById(cinemaId).map(Cinema::getName)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy rạp"));

        return candidates.stream()
                .map(movie -> {
                    Popularity p = popularity.getOrDefault(movie.getId(), Popularity.ZERO);
                    double score = popularityScore(movie, p);
                    String reason = cinemaName == null ? trendReason(p) : "Đang được quan tâm tại " + cinemaName;
                    int confidence = popularityConfidence(p);
                    List<String> signals = trendSignals(p, cinemaName != null);
                    return item(movie, score, confidence, reason, List.of(), signals, null);
                })
                .sorted(Comparator.comparingDouble(RecommendationItem::score).reversed()
                        .thenComparing(x -> x.movie().title()))
                .limit(limit)
                .toList();
    }

    public List<RecommendationItem> similar(UUID movieId, int requestedLimit) {
        int limit = clamp(requestedLimit, 1, 12);
        Movie target = movies.findById(movieId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phim"));
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
                    List<String> signals = new ArrayList<>();
                    if (!matched.isEmpty()) signals.add("Tương đồng thể loại");
                    if (p.bookings30d > 0) signals.add("Lượt đặt 30 ngày");
                    return item(movie, score, Math.min(95, 45 + matched.size() * 15 + popularityConfidence(p) / 4),
                            reason, matched, signals, null);
                })
                .sorted(Comparator.comparingDouble(RecommendationItem::score).reversed()
                        .thenComparing(x -> x.movie().title()))
                .limit(limit)
                .toList();
    }

    @Transactional
    public void recordEvent(String email, RecommendationEventRequest request) {
        AppUser user = findUser(email);
        if (!movies.existsById(request.movieId())) throw new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phim");
        String source = trimToNull(request.source());
        jdbc.update("insert into recommendation_event(id,user_id,movie_id,event_type,source,created_at) values (?,?,?,?,?,current_timestamp)",
                UUID.randomUUID(), user.getId(), request.movieId(), request.eventType().toUpperCase(Locale.ROOT), source);
    }

    @Transactional
    public RecommendationFeedbackResponse saveFeedback(String email, RecommendationFeedbackRequest request) {
        AppUser user = findUser(email);
        if (!movies.existsById(request.movieId())) throw new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phim");
        String type = request.feedbackType().toUpperCase(Locale.ROOT);
        RecommendationFeedback row = feedback.findByUserIdAndMovieId(user.getId(), request.movieId()).orElseGet(RecommendationFeedback::new);
        row.setUserId(user.getId());
        row.setMovieId(request.movieId());
        row.setFeedbackType(type);
        row.setSource(trimToNull(request.source()));
        feedback.save(row);
        return new RecommendationFeedbackResponse(request.movieId(), type, feedbackMessage(type));
    }

    @Transactional
    public void clearFeedback(String email, UUID movieId) {
        AppUser user = findUser(email);
        feedback.deleteByUserIdAndMovieId(user.getId(), movieId);
    }

    private List<RecommendationItem> personalized(UUID cinemaId, int limit, PersonalProfile profile,
                                                  List<RecommendationItem> trendingFallback) {
        List<Movie> candidates = candidates(cinemaId).stream()
                .filter(m -> !profile.hiddenMovies.contains(m.getId()))
                .toList();
        if (!profile.hasTasteSignal()) {
            return trendingFallback.stream()
                    .filter(x -> !profile.hiddenMovies.contains(x.movie().id()))
                    .map(x -> new RecommendationItem(x.movie(), x.score(), x.confidence(),
                            "Gợi ý khám phá dựa trên xu hướng CineBooking", x.matchedGenres(), x.signals(), x.feedback()))
                    .limit(limit).toList();
        }

        Map<UUID, Popularity> popularity = popularity(candidates.stream().map(Movie::getId).toList());
        Map<UUID, Availability> availability = availability(candidates.stream().map(Movie::getId).toList(), profile);
        Map<UUID, Movie> movieById = movies.findAll().stream().collect(Collectors.toMap(Movie::getId, m -> m));

        List<RecommendationItem> ranked = candidates.stream().map(movie -> {
                    Set<String> movieGenres = genres(movie);
                    List<String> matched = movieGenres.stream()
                            .filter(g -> profile.genreWeights.getOrDefault(g, 0.0) > 0.0)
                            .sorted(Comparator.comparingDouble((String g) -> profile.genreWeights.getOrDefault(g, 0.0)).reversed())
                            .map(profile.genreLabels::get)
                            .filter(Objects::nonNull)
                            .limit(3)
                            .toList();
                    double affinity = movieGenres.stream().mapToDouble(g -> profile.genreWeights.getOrDefault(g, 0.0)).sum();
                    Popularity p = popularity.getOrDefault(movie.getId(), Popularity.ZERO);
                    Availability a = availability.getOrDefault(movie.getId(), Availability.NONE);
                    double score = affinity * 2.4 + popularityScore(movie, p) * 0.25;
                    if (a.preferredCinema) score += 4.5;
                    if (a.preferredDaypart) score += 3.5;

                    AnchorMatch anchor = bestAnchor(profile, movie, movieById);
                    if (anchor.sharedGenres > 0) score += Math.min(14.0, 5.0 + anchor.sharedGenres * 3.0);
                    if (profile.lessLikeMovies.contains(movie.getId())) score -= 18.0;
                    if (profile.moreLikeMovies.contains(movie.getId())) score -= 9.0;
                    if (profile.favoriteMovies.contains(movie.getId())) score -= 2.0;
                    if (profile.bookedMovies.contains(movie.getId())) score -= 4.0;
                    if (profile.positivelyReviewedMovies.contains(movie.getId())) score -= 4.5;

                    String reason = recommendationReason(matched, anchor, a, p);
                    List<String> signals = recommendationSignals(matched, anchor, a, p, profile);
                    int confidence = recommendationConfidence(profile, matched.size(), a, anchor, p);
                    return item(movie, score, confidence, reason, matched, signals, profile.feedbackByMovie.get(movie.getId()));
                })
                .sorted(Comparator.comparingDouble(RecommendationItem::score).reversed()
                        .thenComparing(x -> x.movie().title()))
                .limit(limit).toList();

        if (ranked.size() >= limit) return ranked;
        LinkedHashMap<UUID, RecommendationItem> merged = new LinkedHashMap<>();
        ranked.forEach(x -> merged.put(x.movie().id(), x));
        trendingFallback.stream().filter(x -> !profile.hiddenMovies.contains(x.movie().id()))
                .forEach(x -> merged.putIfAbsent(x.movie().id(), x));
        return merged.values().stream().limit(limit).toList();
    }

    private PersonalProfile personalProfile(UUID userId) {
        List<Movie> all = movies.findAll();
        Map<UUID, Movie> byId = all.stream().collect(Collectors.toMap(Movie::getId, m -> m));
        PersonalProfile profile = new PersonalProfile();

        jdbc.query("select movie_id from movie_favorite where user_id=?", rs -> {
            UUID movieId = rs.getObject(1, UUID.class);
            profile.favoriteMovies.add(movieId);
            profile.signalCount++;
            addMovieGenres(profile, byId.get(movieId), 5.0);
        }, userId);

        jdbc.query("select movie_id,rating from movie_review where user_id=?", rs -> {
            UUID movieId = rs.getObject(1, UUID.class);
            int rating = rs.getInt(2);
            profile.signalCount++;
            if (rating >= 4) {
                profile.positivelyReviewedMovies.add(movieId);
                addMovieGenres(profile, byId.get(movieId), rating == 5 ? 5.5 : 4.0);
            } else if (rating <= 2) {
                addMovieGenres(profile, byId.get(movieId), rating == 1 ? -5.0 : -3.5);
            }
        }, userId);

        jdbc.query("""
                select st.movie_id,a.cinema_id,extract(hour from st.start_time)::int as hour_value,count(*) as booking_count
                from booking b
                join showtime st on st.id=b.showtime_id
                join auditorium a on a.id=st.auditorium_id
                where b.user_id=? and b.status='CONFIRMED'
                group by st.movie_id,a.cinema_id,extract(hour from st.start_time)::int
                """, rs -> {
            UUID movieId = rs.getObject("movie_id", UUID.class);
            UUID cinemaId = rs.getObject("cinema_id", UUID.class);
            int hour = rs.getInt("hour_value");
            long count = rs.getLong("booking_count");
            profile.bookedMovies.add(movieId);
            profile.signalCount += (int)Math.min(count, 5);
            addMovieGenres(profile, byId.get(movieId), 4.5 * Math.min(count, 3));
            profile.cinemaWeights.merge(cinemaId, (double)count, Double::sum);
            profile.daypartWeights.merge(daypart(hour), (double)count, Double::sum);
        }, userId);

        jdbc.query("select movie_id,event_type,created_at from recommendation_event where user_id=? and created_at>=now()-interval '120 days'", rs -> {
            UUID movieId = rs.getObject("movie_id", UUID.class);
            String eventType = rs.getString("event_type");
            Instant createdAt = rs.getTimestamp("created_at").toInstant();
            long ageDays = Math.max(0, ChronoUnit.DAYS.between(createdAt, Instant.now()));
            double decay = Math.max(0.25, 1.0 - ageDays / 120.0);
            double base = "CLICK".equals(eventType) ? 1.5 : 0.75;
            profile.signalCount++;
            addMovieGenres(profile, byId.get(movieId), base * decay);
        }, userId);

        for (RecommendationFeedback row : feedback.findByUserIdOrderByUpdatedAtDesc(userId)) {
            profile.feedbackByMovie.put(row.getMovieId(), row.getFeedbackType());
            profile.feedbackCount++;
            profile.signalCount++;
            Movie movie = byId.get(row.getMovieId());
            switch (row.getFeedbackType()) {
                case "MORE_LIKE_THIS" -> {
                    profile.moreLikeMovies.add(row.getMovieId());
                    addMovieGenres(profile, movie, 8.0);
                }
                case "LESS_LIKE_THIS" -> {
                    profile.lessLikeMovies.add(row.getMovieId());
                    addMovieGenres(profile, movie, -7.0);
                }
                case "HIDE" -> profile.hiddenMovies.add(row.getMovieId());
                default -> { }
            }
        }
        return profile;
    }

    private RecommendationTasteProfile tasteProfile(PersonalProfile profile) {
        List<TasteGenre> topGenres = profile.genreWeights.entrySet().stream()
                .filter(e -> e.getValue() > 0.0)
                .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
                .limit(5)
                .map(e -> new TasteGenre(profile.genreLabels.getOrDefault(e.getKey(), e.getKey()), round(e.getValue())))
                .toList();
        UUID cinemaId = profile.preferredCinemaId();
        String cinemaName = cinemaId == null ? null : cinemas.findById(cinemaId).map(Cinema::getName).orElse(null);
        String daypart = profile.preferredDaypart();
        boolean personalized = profile.hasTasteSignal();
        String summary;
        if (!personalized) {
            summary = "Chưa có đủ tín hiệu cá nhân; CineBooking đang dùng xu hướng để giúp bạn khám phá phim mới.";
        } else {
            List<String> parts = new ArrayList<>();
            if (!topGenres.isEmpty()) parts.add("ưu tiên " + topGenres.stream().limit(3).map(TasteGenre::name).collect(Collectors.joining(", ")));
            if (cinemaName != null) parts.add("thường xem tại " + cinemaName);
            if (daypart != null) parts.add("hay chọn " + daypartLabel(daypart).toLowerCase(Locale.ROOT));
            summary = parts.isEmpty() ? "Gu phim đang được tinh chỉnh từ hành vi và phản hồi của bạn." : "CineBooking " + String.join(" · ", parts) + ".";
        }
        return new RecommendationTasteProfile(VERSION, personalized, summary, topGenres, cinemaId, cinemaName,
                daypart, daypartLabel(daypart), profile.signalCount, profile.feedbackCount, profile.hiddenMovies.size());
    }

    private Map<UUID, Availability> availability(List<UUID> movieIds, PersonalProfile profile) {
        Map<UUID, AvailabilityAccumulator> tmp = new HashMap<>();
        if (movieIds.isEmpty() || (profile.preferredCinemaId() == null && profile.preferredDaypart() == null)) return Map.of();
        Set<UUID> allowed = new HashSet<>(movieIds);
        jdbc.query("""
                select st.movie_id,a.cinema_id,extract(hour from st.start_time)::int as hour_value
                from showtime st join auditorium a on a.id=st.auditorium_id
                where st.status='OPEN' and st.start_time>now()
                """, rs -> {
            UUID movieId = rs.getObject("movie_id", UUID.class);
            if (!allowed.contains(movieId)) return;
            AvailabilityAccumulator a = tmp.computeIfAbsent(movieId, x -> new AvailabilityAccumulator());
            UUID cinemaId = rs.getObject("cinema_id", UUID.class);
            int hour = rs.getInt("hour_value");
            if (Objects.equals(profile.preferredCinemaId(), cinemaId)) a.preferredCinema = true;
            if (Objects.equals(profile.preferredDaypart(), daypart(hour))) a.preferredDaypart = true;
        });
        Map<UUID, Availability> result = new HashMap<>();
        tmp.forEach((id, a) -> result.put(id, new Availability(a.preferredCinema, a.preferredDaypart)));
        return result;
    }

    private AnchorMatch bestAnchor(PersonalProfile profile, Movie candidate, Map<UUID, Movie> byId) {
        int best = 0;
        String title = null;
        Set<String> candidateGenres = genres(candidate);
        for (UUID id : profile.moreLikeMovies) {
            if (id.equals(candidate.getId())) continue;
            Movie anchor = byId.get(id);
            if (anchor == null) continue;
            int shared = (int) genres(anchor).stream().filter(candidateGenres::contains).count();
            if (shared > best) { best = shared; title = anchor.getTitle(); }
        }
        return new AnchorMatch(best, title);
    }

    private String recommendationReason(List<String> matched, AnchorMatch anchor, Availability availability, Popularity p) {
        if (anchor.sharedGenres > 0 && anchor.title != null) return "Vì bạn muốn xem thêm phim giống " + anchor.title;
        if (!matched.isEmpty() && availability.preferredCinema) return "Hợp gu " + String.join(", ", matched) + " và có suất tại rạp bạn thường xem";
        if (!matched.isEmpty() && availability.preferredDaypart) return "Hợp gu " + String.join(", ", matched) + " và có suất đúng khung giờ bạn thường chọn";
        if (!matched.isEmpty()) return "Hợp gu " + String.join(", ", matched);
        return trendReason(p);
    }

    private List<String> recommendationSignals(List<String> matched, AnchorMatch anchor, Availability availability,
                                               Popularity p, PersonalProfile profile) {
        List<String> out = new ArrayList<>();
        if (!matched.isEmpty()) out.add("Thể loại hợp gu");
        if (anchor.sharedGenres > 0) out.add("Phản hồi xem thêm phim tương tự");
        if (availability.preferredCinema) out.add("Rạp thường xem");
        if (availability.preferredDaypart) out.add("Khung giờ thường xem");
        if (p.bookings30d > 0) out.add("Lượt đặt 30 ngày");
        if (profile.signalCount >= 5) out.add("Hồ sơ gu đủ tín hiệu");
        return out.stream().distinct().limit(4).toList();
    }

    private int recommendationConfidence(PersonalProfile profile, int matchedGenres, Availability availability,
                                         AnchorMatch anchor, Popularity p) {
        int confidence = 32 + Math.min(28, profile.signalCount * 3) + matchedGenres * 8;
        if (availability.preferredCinema) confidence += 7;
        if (availability.preferredDaypart) confidence += 6;
        if (anchor.sharedGenres > 0) confidence += 10;
        if (p.bookings30d > 0) confidence += 4;
        return Math.max(1, Math.min(99, confidence));
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
                    result.put(rs.getObject("id", UUID.class), mapPopularity(rs));
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
        return round(score);
    }

    private int popularityConfidence(Popularity p) {
        int signal = (int)Math.min(50, p.bookings30d * 5 + p.favorites * 2 + p.reviews + p.upcoming);
        return Math.min(90, 35 + signal);
    }

    private List<String> trendSignals(Popularity p, boolean cinemaScoped) {
        List<String> out = new ArrayList<>();
        if (p.bookings30d > 0) out.add("Lượt đặt 30 ngày");
        if (p.favorites > 0) out.add("Lượt yêu thích");
        if (p.reviews > 0) out.add("Đánh giá cộng đồng");
        if (cinemaScoped) out.add("Có lịch tại rạp đã chọn");
        return out.stream().limit(4).toList();
    }

    private String trendReason(Popularity p) {
        if (p.bookings30d > 0) return "Được đặt nhiều trong 30 ngày gần đây";
        if (p.favorites > 0) return "Được nhiều thành viên yêu thích";
        if (p.reviews > 0) return "Được cộng đồng đánh giá tích cực";
        return "Phim đang có lịch chiếu tại CineBooking";
    }

    private RecommendationItem item(Movie movie, double score, int confidence, String reason,
                                    List<String> matchedGenres, List<String> signals, String feedbackType) {
        return new RecommendationItem(movieService.movieDto(movie), round(score), confidence, reason,
                matchedGenres, signals == null ? List.of() : signals, feedbackType);
    }

    private void addMovieGenres(PersonalProfile profile, Movie movie, double weight) {
        if (movie == null) return;
        for (GenrePart part : genreParts(movie.getGenre())) {
            profile.genreWeights.merge(part.key, weight, Double::sum);
            profile.genreLabels.putIfAbsent(part.key, part.label);
        }
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

    private String daypart(int hour) {
        if (hour < 12) return "MORNING";
        if (hour < 17) return "AFTERNOON";
        if (hour < 21) return "EVENING";
        return "LATE";
    }

    private String daypartLabel(String daypart) {
        if (daypart == null) return null;
        return switch (daypart) {
            case "MORNING" -> "Buổi sáng";
            case "AFTERNOON" -> "Buổi chiều";
            case "EVENING" -> "Buổi tối";
            case "LATE" -> "Suất muộn";
            default -> daypart;
        };
    }

    private String feedbackMessage(String type) {
        return switch (type) {
            case "MORE_LIKE_THIS" -> "Đã ưu tiên thêm phim có gu tương tự.";
            case "LESS_LIKE_THIS" -> "Đã giảm ưu tiên các phim có gu tương tự.";
            case "HIDE" -> "Đã ẩn phim này khỏi gợi ý cá nhân.";
            default -> "Đã cập nhật phản hồi.";
        };
    }

    private AppUser findUser(String email) {
        if (email == null || email.isBlank() || "anonymousUser".equals(email))
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập");
        return users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Không tìm thấy tài khoản"));
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String v = value.trim();
        return v.isEmpty() ? null : v;
    }

    private String normalize(String value) { return value == null ? "" : value.trim().toLowerCase(Locale.ROOT); }
    private int clamp(int value, int min, int max) { return Math.max(min, Math.min(value, max)); }
    private double round(double value) { return Math.round(value * 100.0) / 100.0; }

    private record GenrePart(String key, String label) {}
    private record Popularity(long bookings30d, long favorites, long reviews, double avgRating, long upcoming) {
        static final Popularity ZERO = new Popularity(0, 0, 0, 0, 0);
    }
    private record Availability(boolean preferredCinema, boolean preferredDaypart) {
        static final Availability NONE = new Availability(false, false);
    }
    private static final class AvailabilityAccumulator { boolean preferredCinema; boolean preferredDaypart; }
    private record AnchorMatch(int sharedGenres, String title) {}

    private static final class PersonalProfile {
        final Map<String, Double> genreWeights = new HashMap<>();
        final Map<String, String> genreLabels = new HashMap<>();
        final Map<UUID, Double> cinemaWeights = new HashMap<>();
        final Map<String, Double> daypartWeights = new HashMap<>();
        final Map<UUID, String> feedbackByMovie = new HashMap<>();
        final Set<UUID> favoriteMovies = new HashSet<>();
        final Set<UUID> bookedMovies = new HashSet<>();
        final Set<UUID> positivelyReviewedMovies = new HashSet<>();
        final Set<UUID> moreLikeMovies = new HashSet<>();
        final Set<UUID> lessLikeMovies = new HashSet<>();
        final Set<UUID> hiddenMovies = new HashSet<>();
        int signalCount;
        long feedbackCount;

        boolean hasTasteSignal() {
            return genreWeights.values().stream().anyMatch(v -> Math.abs(v) > 0.25) || !moreLikeMovies.isEmpty() || !lessLikeMovies.isEmpty();
        }
        UUID preferredCinemaId() {
            return cinemaWeights.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(null);
        }
        String preferredDaypart() {
            return daypartWeights.entrySet().stream().max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse(null);
        }
    }
}
