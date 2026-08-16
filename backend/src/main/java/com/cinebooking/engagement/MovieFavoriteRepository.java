package com.cinebooking.engagement;

import com.cinebooking.domain.MovieFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface MovieFavoriteRepository extends JpaRepository<MovieFavorite, UUID> {
    boolean existsByUserIdAndMovieId(UUID userId, UUID movieId);
    Optional<MovieFavorite> findByUserIdAndMovieId(UUID userId, UUID movieId);
    List<MovieFavorite> findByUserIdOrderByCreatedAtDesc(UUID userId);
}
