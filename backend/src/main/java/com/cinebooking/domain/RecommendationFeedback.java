package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "recommendation_feedback", uniqueConstraints = @UniqueConstraint(name = "uq_recommendation_feedback_user_movie", columnNames = {"user_id", "movie_id"}))
public class RecommendationFeedback {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "movie_id", nullable = false) private UUID movieId;
    @Column(name = "feedback_type", nullable = false, length = 24) private String feedbackType;
    @Column(length = 60) private String source;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    @PrePersist void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = createdAt;
    }
    @PreUpdate void preUpdate() { updatedAt = Instant.now(); }

    public UUID getId(){ return id; } public void setId(UUID id){ this.id=id; }
    public UUID getUserId(){ return userId; } public void setUserId(UUID userId){ this.userId=userId; }
    public UUID getMovieId(){ return movieId; } public void setMovieId(UUID movieId){ this.movieId=movieId; }
    public String getFeedbackType(){ return feedbackType; } public void setFeedbackType(String feedbackType){ this.feedbackType=feedbackType; }
    public String getSource(){ return source; } public void setSource(String source){ this.source=source; }
    public Instant getCreatedAt(){ return createdAt; } public void setCreatedAt(Instant createdAt){ this.createdAt=createdAt; }
    public Instant getUpdatedAt(){ return updatedAt; } public void setUpdatedAt(Instant updatedAt){ this.updatedAt=updatedAt; }
}
