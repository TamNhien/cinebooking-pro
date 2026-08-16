ALTER TABLE app_user
    ADD COLUMN loyalty_points INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
    ADD COLUMN membership_tier VARCHAR(20) NOT NULL DEFAULT 'BRONZE';

ALTER TABLE payment
    ADD COLUMN loyalty_points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_points_awarded >= 0);

CREATE TABLE movie_favorite (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_movie_favorite_user_movie UNIQUE(user_id, movie_id)
);
CREATE INDEX idx_movie_favorite_user_created ON movie_favorite(user_id, created_at DESC);
CREATE INDEX idx_movie_favorite_movie ON movie_favorite(movie_id);

CREATE TABLE movie_review (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_movie_review_user_movie UNIQUE(user_id, movie_id)
);
CREATE INDEX idx_movie_review_movie_created ON movie_review(movie_id, created_at DESC);
CREATE INDEX idx_movie_review_user ON movie_review(user_id);
