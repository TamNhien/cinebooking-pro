package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "movie_review", uniqueConstraints = @UniqueConstraint(name = "uq_movie_review_user_movie", columnNames = {"user_id", "movie_id"}))
public class MovieReview {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "movie_id", nullable = false) private UUID movieId;
    @Column(nullable = false) private Integer rating;
    @Column(columnDefinition = "text") private String comment;
    @Column(name = "created_at", nullable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    @PrePersist void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
    }
    @PreUpdate void preUpdate(){ updatedAt = Instant.now(); }
    public UUID getId(){ return id; } public void setId(UUID id){ this.id=id; }
    public UUID getUserId(){ return userId; } public void setUserId(UUID userId){ this.userId=userId; }
    public UUID getMovieId(){ return movieId; } public void setMovieId(UUID movieId){ this.movieId=movieId; }
    public Integer getRating(){ return rating; } public void setRating(Integer rating){ this.rating=rating; }
    public String getComment(){ return comment; } public void setComment(String comment){ this.comment=comment; }
    public Instant getCreatedAt(){ return createdAt; } public void setCreatedAt(Instant createdAt){ this.createdAt=createdAt; }
    public Instant getUpdatedAt(){ return updatedAt; } public void setUpdatedAt(Instant updatedAt){ this.updatedAt=updatedAt; }
}
