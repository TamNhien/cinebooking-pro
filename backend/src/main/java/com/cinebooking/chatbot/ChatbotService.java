package com.cinebooking.chatbot;

import com.cinebooking.movie.MovieService;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

import static com.cinebooking.chatbot.ChatbotDtos.*;
import static com.cinebooking.movie.MovieDtos.*;

@Service
public class ChatbotService {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("dd/MM HH:mm").withZone(VIETNAM);
    private static final List<String> GENRE_WORDS = List.of("hanh dong", "action", "kinh di", "horror", "hai", "comedy", "tinh cam", "romance", "hoat hinh", "animation", "anime", "phieu luu", "adventure", "khoa hoc vien tuong", "sci-fi", "tam ly", "drama", "gia dinh", "family");

    private final MovieService movies;
    private final ChatbotAiClient ai;

    public ChatbotService(MovieService movies, ChatbotAiClient ai) { this.movies = movies; this.ai = ai; }

    public ChatResponse reply(ChatRequest request) {
        String query = request.message().strip();
        boolean en = "en".equalsIgnoreCase(request.language());
        List<MovieResponse> catalog = movies.listMovies().stream().limit(40).toList();
        List<ShowtimeResponse> showtimes = movies.listShowtimes(null).stream().limit(100).toList();
        List<CinemaPublicResponse> cinemas = movies.listCinemas().stream().limit(30).toList();
        MovieResponse selected = findMovie(query, catalog);
        if (selected == null && request.history() != null) {
            List<ChatTurn> history = request.history();
            for (int i = history.size() - 1; i >= Math.max(0, history.size() - 6); i--) {
                ChatTurn turn = history.get(i);
                if (turn != null && "user".equals(turn.role()) && turn.content() != null) {
                    selected = findMovie(turn.content(), catalog);
                    if (selected != null) break;
                }
            }
        }

        List<ChatLink> links = new ArrayList<>();
        if (selected != null) links.add(new ChatLink(en ? "Movie details" : "Xem chi tiết phim", "/movies/" + selected.id()));
        else links.add(new ChatLink(en ? "Explore movies" : "Khám phá phim", "/movies"));
        List<String> suggestions = en
            ? List.of("Recommend a movie", "What is showing today?", "How do I book tickets?")
            : List.of("Gợi ý phim hay", "Lịch chiếu hôm nay", "Hướng dẫn đặt vé");
        String catalogText = buildCatalog(catalog, cinemas, showtimes);
        Optional<String> aiReply = ai.respond(en ? "en" : "vi", query, request.history(), catalogText);
        if (aiReply.isPresent()) {
            if (containsAny(normalize(query), "showtime", "suat chieu", "lich chieu", "gio chieu", "rap", "cinema"))
                links.add(new ChatLink(en ? "Cinemas & showtimes" : "Rạp và lịch chiếu", "/cinemas"));
            return new ChatResponse(aiReply.get(), links, suggestions, "ai");
        }
        return offlineReply(query, en, catalog, showtimes, cinemas, selected, links, suggestions);
    }

    private ChatResponse offlineReply(String query, boolean en, List<MovieResponse> catalog,
            List<ShowtimeResponse> showtimes, List<CinemaPublicResponse> cinemas,
            MovieResponse selected, List<ChatLink> links, List<String> suggestions) {
        String q = normalize(query);
        String text;
        if (selected != null && containsAny(q, "suat", "lich", "gio", "ngay", "showtime", "schedule", "price", "gia", "bao nhieu", "ve")) {
            List<ShowtimeResponse> specific = showtimes.stream().filter(s -> s.movieId().equals(selected.id())).limit(4).toList();
            text = specific.isEmpty()
                ? (en ? "I found " + selected.title() + ", but there are no upcoming open showtimes in the system." : "Mình tìm thấy phim " + selected.title() + ", nhưng hệ thống chưa có suất chiếu sắp tới đang mở bán.")
                : (en ? "Upcoming showtimes for " : "Suất chiếu sắp tới của ") + selected.title() + ":\n" + showtimeLines(specific, en);
            links.add(new ChatLink(en ? "All showtimes" : "Xem toàn bộ lịch chiếu", "/cinemas"));
            if (!specific.isEmpty()) links.add(new ChatLink(en ? "Book a seat" : "Đặt ghế ngay", "/booking/" + specific.get(0).id()));
        } else if (selected != null) {
            text = (en ? "Here's what I know about " : "Mình có thông tin về ") + selected.title() + ":\n"
                + (selected.genre() == null ? "" : (en ? "Genre: " : "Thể loại: ") + selected.genre() + "\n")
                + (selected.durationMinutes() == null ? "" : (en ? "Duration: " : "Thời lượng: ") + selected.durationMinutes() + (en ? " minutes\n" : " phút\n"))
                + (selected.rating() == null ? "" : (en ? "Classification: " : "Phân loại: ") + selected.rating() + "\n")
                + (selected.description() == null ? "" : selected.description().strip().substring(0, Math.min(250, selected.description().strip().length())));
        } else if (containsAny(q, "lich chieu", "suat chieu", "gio chieu", "showtime", "schedule", "hom nay", "today")) {
            List<ShowtimeResponse> upcoming = showtimes.stream().limit(5).toList();
            text = upcoming.isEmpty()
                ? (en ? "There are no upcoming open showtimes in the system right now. Check again on the showtimes page." : "Hiện hệ thống chưa có suất chiếu sắp tới đang mở bán. Bạn có thể kiểm tra lại ở trang Lịch chiếu.")
                : (en ? "Here are the next available showtimes:\n" : "Các suất chiếu mở bán sắp tới:\n") + showtimeLines(upcoming, en);
            links.add(new ChatLink(en ? "View all showtimes" : "Xem lịch chiếu", "/cinemas"));
        } else if (containsAny(q, "gia ve", "bao nhieu tien", "ticket price", "how much", "price")) {
            if (showtimes.isEmpty()) text = en ? "Ticket prices depend on the showtime and seat. Please choose a showing to see the actual checkout price." : "Giá vé tùy suất chiếu và loại ghế. Bạn chọn suất chiếu để xem giá thực tế trước khi thanh toán nhé.";
            else {
                BigDecimal min = showtimes.stream().map(ShowtimeResponse::basePrice).filter(Objects::nonNull).min(BigDecimal::compareTo).orElse(null);
                text = min == null ? (en ? "Seat prices are shown at checkout." : "Giá ghế sẽ được hiển thị khi đặt vé.")
                    : (en ? "Current base prices start from " : "Giá cơ bản của các suất chiếu đang mở bán từ ") + formatPrice(min) + ". "
                    + (en ? "Final prices may vary by seat and applied offers." : "Giá cuối cùng có thể thay đổi theo ghế và ưu đãi.");
            }
        } else if (containsAny(q, "rap", "cinema", "theater", "dia chi", "gan day", "near me")) {
            text = cinemas.isEmpty() ? (en ? "No cinema locations have been published yet." : "Hệ thống chưa công bố danh sách rạp.")
                : (en ? "CineBooking cinema locations:\n" : "Các rạp CineBooking hiện có:\n") + cinemas.stream().limit(5).map(c -> "• " + c.name() + " — " + c.address()).collect(Collectors.joining("\n"));
            links.add(new ChatLink(en ? "Browse cinemas" : "Xem các rạp", "/cinemas"));
        } else if (containsAny(q, "dat ve", "mua ve", "chon ghe", "thanh toan", "booking", "book ticket", "reserve", "payment", "ticket")) {
            text = en ? "Of course! 1) Open Movies, 2) choose a movie and showtime, 3) pick seats, 4) sign in and complete checkout. You can review your tickets under My Bookings. I can't make payments on your behalf."
                : "Dạ được ạ! 🎟️ Bạn làm theo các bước: 1) Mở trang Phim, 2) chọn phim và suất chiếu, 3) chọn ghế, 4) đăng nhập và thanh toán. Vé của bạn sẽ nằm ở mục Vé của tôi. Mình không thực hiện thanh toán thay khách hàng nhé.";
            links.add(new ChatLink(en ? "My bookings" : "Vé của tôi", "/bookings"));
        } else if (containsAny(q, "hoan tien", "huy ve", "doi ve", "refund", "cancel", "change ticket")) {
            text = en ? "Refund or cancellation eligibility depends on your booking and the system's current policy. Please check your booking details for available options, or contact staff."
                : "Việc hủy, đổi hoặc hoàn tiền phụ thuộc trạng thái vé và chính sách áp dụng. Bạn hãy mở chi tiết vé để kiểm tra lựa chọn hiện có hoặc liên hệ nhân viên hỗ trợ nhé.";
            links.add(new ChatLink(en ? "My bookings" : "Kiểm tra vé", "/bookings"));
        } else if (containsAny(q, "cam on", "thanks", "thank you", "thank u")) {
            text = en ? "You're very welcome! 😊 Enjoy your movie. Anything else I can help with?" : "Không có gì đâu ạ! 😊 Chúc bạn có một buổi xem phim thật vui. Cần gì cứ nhắn mình nhé!";
        } else if (containsAny(q, "ban ten gi", "ten ban", "who are you", "your name", "ban la ai")) {
            text = en ? "I'm CineBot, CineBooking Pro's virtual movie assistant! 🎬 I can help you find movies, showtimes, theaters and booking instructions."
                : "Mình là CineBot 🤖, trợ lý phim của CineBooking Pro! Mình có thể tám chuyện về phim, gợi ý phim theo sở thích và giúp bạn tìm lịch chiếu, rạp, cách đặt vé.";
        } else if (containsAny(q, "khoe khong", "how are you", "what's up", "buon qua", "chan qua", "lonely")) {
            text = en ? "I'm doing great—especially when we get to talk about movies! 🍿 What kind of stories are you in the mood for?"
                : "Mình vẫn tràn đầy năng lượng và sẵn sàng tám chuyện với bạn đây! 🍿 Hôm nay bạn thích xem phim vui vẻ, gay cấn hay nhẹ nhàng?";
        } else if (containsAny(q, "goi y", "phim hay", "phim nao", "phim gi", "recommend", "suggest", "movie", "phim", "hanh dong", "kinh di", "hai", "tinh cam", "comedy", "horror", "action", "romance")) {
            String genre = GENRE_WORDS.stream().filter(word -> containsAny(q, word)).findFirst().orElse("");
            List<MovieResponse> picked = catalog.stream().filter(m -> genre.isEmpty() || matchesGenre(m, genre)).limit(4).toList();
            text = picked.isEmpty() ? (en ? "I couldn't find a matching movie in the current catalog. Try a different genre!" : "Mình chưa tìm thấy phim hợp với thể loại này trong danh sách hiện tại. Bạn thử thể loại khác nhé!")
                : (en ? "Here are a few films you could enjoy 🎬:\n" : "Đây là vài phim mình gợi ý cho bạn nè 🎬:\n")
                    + picked.stream().map(m -> "• " + m.title() + (m.genre() == null ? "" : " (" + m.genre() + ")")).collect(Collectors.joining("\n"))
                    + (en ? "\nWhich one catches your eye?" : "\nBạn thích phim nào? Mình kể thêm cho nghe nhé!");
            for (MovieResponse movie : picked.stream().limit(3).toList()) links.add(new ChatLink(movie.title(), "/movies/" + movie.id()));
        } else if (containsAny(q, "xin chao", "chao", "hello", "hi", "hey", "alo", "good morning", "good evening")) {
            text = en ? "Hello! 👋 Welcome to CineBooking Pro! I'm CineBot. Want a movie recommendation, showtimes, or just a friendly movie chat?"
                : "Xin chào bạn! 👋 Chào mừng đến CineBooking Pro! Mình là CineBot, rất vui được trò chuyện với bạn. Bạn muốn mình gợi ý phim hay, tìm lịch chiếu hay cứ tám chuyện một chút nè?";
        } else {
            text = en ? "I'd love to chat! 🎬 I can help with films, genres, cinema schedules and ticket booking. Tell me what you enjoy watching, or ask me anything about movies."
                : "Mình rất vui được trò chuyện cùng bạn! 🎬 Bạn có thể kể gu phim của mình, hỏi về phim, lịch chiếu, giá vé hoặc cách đặt vé nha. Bạn thích thể loại phim nào nhất?";
        }
        return new ChatResponse(text.strip(), links.stream().distinct().limit(5).toList(), suggestions, "local");
    }

    private static String showtimeLines(List<ShowtimeResponse> shows, boolean en) {
        return shows.stream().map(s -> "• " + s.movieTitle() + " — " + s.cinemaName() + ", " + TIME.format(s.startTime())
            + (s.basePrice() == null ? "" : " — " + formatPrice(s.basePrice()))).collect(Collectors.joining("\n"))
            + (en ? "\nFinal seat prices are shown during checkout." : "\nGiá thực tế theo ghế hiển thị khi đặt vé.");
    }

    private static boolean matchesGenre(MovieResponse movie, String genre) {
        String value = normalize((movie.genre() == null ? "" : movie.genre()) + " " + (movie.description() == null ? "" : movie.description()));
        String canonical = switch (genre) {
            case "action" -> "hanh dong"; case "horror" -> "kinh di";
            case "comedy" -> "hai"; case "romance" -> "tinh cam";
            case "animation", "anime" -> "hoat hinh"; case "adventure" -> "phieu luu";
            case "sci-fi" -> "khoa hoc vien tuong"; case "drama" -> "tam ly";
            case "family" -> "gia dinh"; default -> genre;
        };
        return value.contains(genre) || value.contains(canonical);
    }

    private static MovieResponse findMovie(String question, List<MovieResponse> catalog) {
        String query = " " + normalize(question) + " ";
        return catalog.stream().filter(m -> m.title() != null)
            .filter(m -> {
                String title = normalize(m.title());
                return title.length() > 2 && (title.length() >= 5 ? query.contains(title) : query.contains(" " + title + " "));
            })
            .max(Comparator.comparingInt(m -> normalize(m.title()).length())).orElse(null);
    }

    static String normalize(String value) {
        String ascii = Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "").replace('đ','d').replace('Đ','D');
        return ascii.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
    }
    private static boolean containsAny(String normalized, String... words) {
        String padded = " " + normalized + " ";
        for (String word : words) if (padded.contains(" " + word + " ")) return true;
        return false;
    }
    private static String formatPrice(BigDecimal price) {
        return String.format(Locale.US, "%,.0f", price) + " ₫";
    }

    private static String buildCatalog(List<MovieResponse> catalog, List<CinemaPublicResponse> cinemas, List<ShowtimeResponse> showtimes) {
        StringBuilder out = new StringBuilder("Movies:\n");
        for (MovieResponse m : catalog.stream().limit(30).toList()) {
            out.append("- ").append(safe(m.title(), 90)).append(" | genre=").append(safe(m.genre(), 60))
                .append(" | minutes=").append(m.durationMinutes()).append(" | age_rating=").append(safe(m.rating(), 20))
                .append(" | description=").append(safe(m.description(), 120)).append('\n');
        }
        out.append("Cinemas:\n");
        for (CinemaPublicResponse c : cinemas.stream().limit(15).toList())
            out.append("- ").append(safe(c.name(), 70)).append(" | ").append(safe(c.address(), 150)).append('\n');
        out.append("Upcoming showtimes (timezone Asia/Ho_Chi_Minh; price is BASE only):\n");
        for (ShowtimeResponse s : showtimes.stream().limit(35).toList())
            out.append("- ").append(safe(s.movieTitle(), 90)).append(" | ").append(safe(s.cinemaName(), 60))
                .append(" | ").append(TIME.format(s.startTime())).append(" | ").append(s.basePrice()).append(" VND\n");
        return out.substring(0, Math.min(out.length(), 11000));
    }
    private static String safe(String text, int maxLength) {
        if (text == null) return "-";
        String value = text.replaceAll("[\\p{Cntrl}]+", " ").replaceAll("\\s+", " ").strip();
        return value.substring(0, Math.min(value.length(), maxLength));
    }
}
