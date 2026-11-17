package com.cinebooking.chatbot;

import com.cinebooking.movie.MovieService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static com.cinebooking.chatbot.ChatbotDtos.*;
import static com.cinebooking.movie.MovieDtos.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatbotServiceTest {
    @Mock private MovieService catalog;
    @Mock private ChatbotAiClient ai;
    private ChatbotService service;
    private final UUID movieId = UUID.randomUUID();
    private final UUID showtimeId = UUID.randomUUID();

    @BeforeEach
    void setup() {
        service = new ChatbotService(catalog, ai);
        when(catalog.listMovies()).thenReturn(List.of(new MovieResponse(movieId, "Hành Trình Sao Hỏa",
            "Phiêu lưu ngoài không gian", 120, null, "T13", "Khoa học viễn tưởng",
            "Vietnamese", null, LocalDate.of(2026, 10, 1), true, 4.5, 10)));
        when(catalog.listShowtimes(null)).thenReturn(List.of(new ShowtimeResponse(showtimeId, movieId,
            "Hành Trình Sao Hỏa", UUID.randomUUID(), "Phòng 1", UUID.randomUUID(),
            "CineBooking Quận 1", "TP.HCM", Instant.parse("2099-12-01T12:00:00Z"),
            new BigDecimal("80000"), "OPEN", "MANUAL", null, null)));
        when(catalog.listCinemas()).thenReturn(List.of(new CinemaPublicResponse(UUID.randomUUID(),
            "CineBooking Quận 1", "TP.HCM")));
        when(ai.respond(anyString(), anyString(), anyList(), anyString())).thenReturn(Optional.empty());
    }

    @Test void greetsVietnameseVisitors() {
        ChatResponse reply = service.reply(new ChatRequest("Xin chào", "vi", List.of()));
        assertTrue(reply.reply().contains("CineBot"));
        assertEquals("local", reply.mode());
    }

    @Test void selectsRealMovieAndShowtimes() {
        ChatResponse reply = service.reply(new ChatRequest("Phim Hành Trình Sao Hỏa mấy giờ?", "vi", List.of()));
        assertTrue(reply.reply().contains("CineBooking Quận 1"));
        assertTrue(reply.links().stream().anyMatch(link -> link.href().equals("/booking/" + showtimeId)));
    }

    @Test void followsUpOnMovieFromPreviousUserTurn() {
        ChatResponse reply = service.reply(new ChatRequest("Có suất chiếu không?", "vi",
            List.of(new ChatTurn("user", "Cho xem phim Hành Trình Sao Hỏa"))));
        assertTrue(reply.reply().contains("Hành Trình Sao Hỏa"));
    }

    @Test void givesBookingInstructionsWithoutClaimingPayment() {
        ChatResponse reply = service.reply(new ChatRequest("Hướng dẫn đặt vé", "vi", List.of()));
        assertTrue(reply.links().stream().anyMatch(link -> link.href().equals("/bookings")));
        assertFalse(reply.reply().contains("đã thanh toán"));
    }

    @Test void prefersConfiguredAiWhenAvailable() {
        when(ai.respond(anyString(), anyString(), anyList(), anyString())).thenReturn(Optional.of("Xin chào từ AI"));
        ChatResponse reply = service.reply(new ChatRequest("Chào bạn", "vi", List.of()));
        assertEquals("ai", reply.mode());
        assertEquals("Xin chào từ AI", reply.reply());
    }
}
