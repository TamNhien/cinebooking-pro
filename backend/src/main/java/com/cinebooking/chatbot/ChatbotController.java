package com.cinebooking.chatbot;

import com.cinebooking.common.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;

import static com.cinebooking.chatbot.ChatbotDtos.*;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {
    private final ChatbotService service;
    private final ConcurrentHashMap<String, MinuteBucket> requests = new ConcurrentHashMap<>();

    public ChatbotController(ChatbotService service) { this.service = service; }

    @PostMapping("/message")
    public ChatResponse chat(@Valid @RequestBody ChatRequest input, HttpServletRequest request) {
        // Bounded, per-connection rate limiting prevents accidental expensive public LLM traffic.
        // Do not trust client-supplied X-Forwarded-For: it can be forged without a trusted proxy.
        String address = request.getRemoteAddr();
        long minute = Instant.now().getEpochSecond() / 60;
        if (requests.size() > 4096) requests.entrySet().removeIf(e -> e.getValue().minute < minute - 1);
        MinuteBucket bucket = requests.computeIfAbsent(address, ignored -> new MinuteBucket(minute));
        synchronized (bucket) {
            if (bucket.minute != minute) { bucket.minute = minute; bucket.count = 0; }
            if (++bucket.count > 50) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                "Bạn gửi tin nhắn quá nhanh. Vui lòng thử lại sau ít phút.");
        }
        return service.reply(input);
    }

    private static final class MinuteBucket {
        private long minute;
        private int count;
        private MinuteBucket(long minute) { this.minute = minute; }
    }
}
