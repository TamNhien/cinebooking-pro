package com.cinebooking.recommendation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import static com.cinebooking.recommendation.RecommendationDtos.*;

@RestController
@RequestMapping("/api/recommendations")
@Validated
public class RecommendationController {
    private final RecommendationService service;

    public RecommendationController(RecommendationService service) { this.service = service; }

    @GetMapping("/home")
    public RecommendationHomeResponse home(Authentication authentication,
                                           @RequestParam(required = false) UUID cinemaId,
                                           @RequestParam(defaultValue = "8") @Min(1) @Max(20) int limit) {
        String email = authentication == null ? null : authentication.getName();
        return service.home(email, cinemaId, limit);
    }

    @GetMapping("/trending")
    public List<RecommendationItem> trending(@RequestParam(required = false) UUID cinemaId,
                                             @RequestParam(defaultValue = "8") @Min(1) @Max(20) int limit) {
        return service.trending(cinemaId, limit);
    }

    @GetMapping("/similar/{movieId}")
    public List<RecommendationItem> similar(@PathVariable UUID movieId,
                                            @RequestParam(defaultValue = "6") @Min(1) @Max(12) int limit) {
        return service.similar(movieId, limit);
    }

    @GetMapping("/profile")
    public RecommendationTasteProfile profile(Authentication authentication) {
        return service.profile(authentication.getName());
    }

    @PostMapping("/events")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void event(Authentication authentication, @Valid @RequestBody RecommendationEventRequest request) {
        service.recordEvent(authentication.getName(), request);
    }

    @PutMapping("/feedback")
    public RecommendationFeedbackResponse feedback(Authentication authentication,
                                                   @Valid @RequestBody RecommendationFeedbackRequest request) {
        return service.saveFeedback(authentication.getName(), request);
    }

    @DeleteMapping("/feedback/{movieId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearFeedback(Authentication authentication, @PathVariable UUID movieId) {
        service.clearFeedback(authentication.getName(), movieId);
    }
}
