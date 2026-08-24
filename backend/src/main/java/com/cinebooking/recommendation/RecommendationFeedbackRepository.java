package com.cinebooking.recommendation;

import com.cinebooking.domain.RecommendationFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface RecommendationFeedbackRepository extends JpaRepository<RecommendationFeedback, UUID> {
    List<RecommendationFeedback> findByUserIdOrderByUpdatedAtDesc(UUID userId);
    Optional<RecommendationFeedback> findByUserIdAndMovieId(UUID userId, UUID movieId);
    long countByUserId(UUID userId);
    long countByUserIdAndFeedbackType(UUID userId, String feedbackType);
    void deleteByUserIdAndMovieId(UUID userId, UUID movieId);
}
