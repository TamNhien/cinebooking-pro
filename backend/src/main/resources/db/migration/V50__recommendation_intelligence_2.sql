CREATE TABLE recommendation_feedback (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    movie_id UUID NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    feedback_type VARCHAR(24) NOT NULL,
    source VARCHAR(60),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_recommendation_feedback_user_movie UNIQUE(user_id, movie_id),
    CONSTRAINT ck_recommendation_feedback_type CHECK (feedback_type IN ('MORE_LIKE_THIS','LESS_LIKE_THIS','HIDE'))
);

CREATE INDEX idx_recommendation_feedback_user_updated
    ON recommendation_feedback(user_id, updated_at DESC);
CREATE INDEX idx_recommendation_feedback_movie_type
    ON recommendation_feedback(movie_id, feedback_type);

-- V50 keeps V25 interaction history intact while adding explicit preference control.
-- No historical feedback is fabricated by the migration; reference/dev data is seeded separately.
