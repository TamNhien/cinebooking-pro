package com.cinebooking.chatbot;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class ChatbotDtos {
    private ChatbotDtos() {}

    public record ChatTurn(@NotBlank String role, @NotBlank @Size(max = 500) String content) {}
    public record ChatRequest(@NotBlank @Size(max = 500) String message,
                              @Pattern(regexp = "vi|en") String language,
                              @Size(max = 8) List<@Valid ChatTurn> history) {}
    public record ChatLink(String label, String href) {}
    public record ChatResponse(String reply, List<ChatLink> links,
                               List<String> suggestions, String mode) {}
}
