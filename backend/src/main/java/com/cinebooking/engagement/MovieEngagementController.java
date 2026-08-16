package com.cinebooking.engagement;

import com.cinebooking.movie.MovieDtos.MovieResponse;
import com.cinebooking.movie.MovieService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;

import static com.cinebooking.engagement.EngagementDtos.*;

@RestController
@RequestMapping("/api")
public class MovieEngagementController {
    private final MovieEngagementService service;
    private final MovieService movieService;
    public MovieEngagementController(MovieEngagementService service, MovieService movieService){this.service=service;this.movieService=movieService;}

    @GetMapping("/movies/{movieId}/reviews")
    public List<ReviewResponse> reviews(@PathVariable UUID movieId, Authentication auth){ return service.listReviews(movieId,auth==null?null:auth.getName()); }
    @GetMapping("/movies/{movieId}/rating-summary")
    public RatingSummary summary(@PathVariable UUID movieId){ return service.summary(movieId); }

    @GetMapping("/me/favorites")
    public List<MovieResponse> favorites(Authentication auth){ return service.favoriteMovieIds(auth.getName()).stream().map(movieService::getMovie).toList(); }
    @GetMapping("/me/favorites/{movieId}")
    public FavoriteState favorite(@PathVariable UUID movieId, Authentication auth){ return new FavoriteState(service.isFavorite(movieId,auth.getName())); }
    @PutMapping("/me/favorites/{movieId}")
    public FavoriteState favorite(@PathVariable UUID movieId, @RequestBody FavoriteState req, Authentication auth){ return service.setFavorite(movieId,auth.getName(),req.favorite()); }

    @PutMapping("/movies/{movieId}/reviews/me")
    public ReviewResponse review(@PathVariable UUID movieId, @Valid @RequestBody ReviewRequest req, Authentication auth){ return service.upsertReview(movieId,auth.getName(),req); }
    @DeleteMapping("/movies/{movieId}/reviews/me") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReview(@PathVariable UUID movieId, Authentication auth){ service.deleteOwnReview(movieId,auth.getName()); }
}
