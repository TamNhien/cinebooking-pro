package com.cinebooking.engagement;

import com.cinebooking.common.ApiException;
import com.cinebooking.domain.*;
import com.cinebooking.movie.MovieRepository;
import com.cinebooking.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

import static com.cinebooking.engagement.EngagementDtos.*;

@Service
public class MovieEngagementService {
    private final MovieFavoriteRepository favorites;
    private final MovieReviewRepository reviews;
    private final MovieRepository movies;
    private final UserRepository users;

    public MovieEngagementService(MovieFavoriteRepository favorites, MovieReviewRepository reviews, MovieRepository movies, UserRepository users) {
        this.favorites=favorites; this.reviews=reviews; this.movies=movies; this.users=users;
    }

    public boolean isFavorite(UUID movieId, String email) {
        return favorites.existsByUserIdAndMovieId(user(email).getId(), movieId);
    }

    @Transactional
    public FavoriteState setFavorite(UUID movieId, String email, boolean value) {
        ensureMovie(movieId); UUID userId=user(email).getId();
        Optional<MovieFavorite> existing=favorites.findByUserIdAndMovieId(userId,movieId);
        if(value && existing.isEmpty()) { MovieFavorite f=new MovieFavorite(); f.setUserId(userId); f.setMovieId(movieId); favorites.save(f); }
        if(!value) existing.ifPresent(favorites::delete);
        return new FavoriteState(value);
    }

    public List<UUID> favoriteMovieIds(String email) {
        UUID userId=user(email).getId();
        return favorites.findByUserIdOrderByCreatedAtDesc(userId).stream().map(MovieFavorite::getMovieId).toList();
    }

    public List<ReviewResponse> listReviews(UUID movieId, String currentEmail) {
        UUID mine=currentEmail==null?null:users.findByEmailIgnoreCase(currentEmail).map(AppUser::getId).orElse(null);
        return reviews.findByMovieIdOrderByCreatedAtDesc(movieId).stream().map(r->dto(r,mine)).toList();
    }

    public RatingSummary summary(UUID movieId) {
        return new RatingSummary(round(reviews.averageByMovieId(movieId)), reviews.countByMovieId(movieId));
    }

    @Transactional
    public ReviewResponse upsertReview(UUID movieId, String email, ReviewRequest req) {
        ensureMovie(movieId); AppUser u=user(email);
        MovieReview r=reviews.findByUserIdAndMovieId(u.getId(),movieId).orElseGet(()->{ MovieReview x=new MovieReview(); x.setUserId(u.getId()); x.setMovieId(movieId); return x; });
        r.setRating(req.rating()); r.setComment(clean(req.comment()));
        return dto(reviews.save(r),u.getId());
    }

    @Transactional
    public void deleteOwnReview(UUID movieId, String email) {
        AppUser u=user(email); MovieReview r=reviews.findByUserIdAndMovieId(u.getId(),movieId).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Bạn chưa đánh giá phim này")); reviews.delete(r);
    }

    public List<ReviewResponse> adminList() { return reviews.findAllByOrderByCreatedAtDesc().stream().map(r->dto(r,null)).toList(); }
    @Transactional public void adminDelete(UUID id) { reviews.delete(reviews.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy đánh giá"))); }

    public double average(UUID movieId){ return round(reviews.averageByMovieId(movieId)); }
    public long count(UUID movieId){ return reviews.countByMovieId(movieId); }

    private ReviewResponse dto(MovieReview r, UUID mine) {
        AppUser u=users.findById(r.getUserId()).orElse(null);
        return new ReviewResponse(r.getId(),r.getMovieId(),r.getUserId(),u==null?"Thành viên":u.getFullName(),r.getRating(),r.getComment(),r.getCreatedAt(),r.getUpdatedAt(),mine!=null&&mine.equals(r.getUserId()));
    }
    private AppUser user(String email){ return users.findByEmailIgnoreCase(email).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy người dùng")); }
    private void ensureMovie(UUID id){ if(!movies.existsById(id)) throw new ApiException(HttpStatus.NOT_FOUND,"Không tìm thấy phim"); }
    private String clean(String v){ return v==null||v.isBlank()?null:v.trim(); }
    private double round(Double v){ return v==null?0d:Math.round(v*10d)/10d; }
}
