package com.cinebooking.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "movie_favorite", uniqueConstraints = @UniqueConstraint(name = "uq_movie_favorite_user_movie", columnNames = {"user_id", "movie_id"}))
public class MovieFavorite {
    @Id private UUID id;
    @Column(name = "user_id", nullable = false) private UUID userId;
    @Column(name = "movie_id", nullable = false) private UUID movieId;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    @PrePersist void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
    public UUID getId(){ return id; } public void setId(UUID id){ this.id=id; }
    public UUID getUserId(){ return userId; } public void setUserId(UUID userId){ this.userId=userId; }
    public UUID getMovieId(){ return movieId; } public void setMovieId(UUID movieId){ this.movieId=movieId; }
    public Instant getCreatedAt(){ return createdAt; } public void setCreatedAt(Instant createdAt){ this.createdAt=createdAt; }
}
