package com.cinebooking.movie;
import com.cinebooking.domain.Movie;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;import java.util.UUID;
public interface MovieRepository extends JpaRepository<Movie, UUID> {
    List<Movie> findByActiveTrueOrderByCreatedAtDesc();
    List<Movie> findAllByOrderByCreatedAtDesc();
}
