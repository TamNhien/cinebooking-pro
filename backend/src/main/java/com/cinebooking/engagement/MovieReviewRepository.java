package com.cinebooking.engagement;

import com.cinebooking.domain.MovieReview;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface MovieReviewRepository extends JpaRepository<MovieReview, UUID> {
    Optional<MovieReview> findByUserIdAndMovieId(UUID userId, UUID movieId);
    List<MovieReview> findByMovieIdOrderByCreatedAtDesc(UUID movieId);
    List<MovieReview> findAllByOrderByCreatedAtDesc();
    long countByMovieId(UUID movieId);
    @Query("select avg(r.rating) from MovieReview r where r.movieId = :movieId")
    Double averageByMovieId(@Param("movieId") UUID movieId);
}
