ALTER TABLE movie
    ADD COLUMN genre VARCHAR(200),
    ADD COLUMN movie_language VARCHAR(80),
    ADD COLUMN trailer_url TEXT;

UPDATE movie
SET genre = 'Khoa học viễn tưởng,Phiêu lưu', movie_language = 'Tiếng Việt'
WHERE id = '11111111-1111-1111-1111-111111111111' AND genre IS NULL;

UPDATE movie
SET genre = 'Tâm lý,Tình cảm', movie_language = 'Tiếng Việt'
WHERE id = '22222222-2222-2222-2222-222222222222' AND genre IS NULL;

CREATE TABLE recommendation_event (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('CLICK','VIEW')),
    source VARCHAR(60),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recommendation_event_user_created
    ON recommendation_event(user_id, created_at DESC);
CREATE INDEX idx_recommendation_event_movie_created
    ON recommendation_event(movie_id, created_at DESC);
CREATE INDEX idx_movie_active_genre
    ON movie(active, genre);
CREATE INDEX idx_booking_user_status_showtime_v25
    ON booking(user_id, status, showtime_id);
CREATE INDEX idx_movie_review_user_rating_v25
    ON movie_review(user_id, rating, movie_id);
