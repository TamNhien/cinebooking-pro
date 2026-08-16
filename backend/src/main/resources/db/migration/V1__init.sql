CREATE TABLE app_user (
    id UUID PRIMARY KEY,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    role VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE movie (
    id UUID PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    poster_url TEXT,
    rating VARCHAR(20),
    release_date DATE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cinema (
    id UUID PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    address VARCHAR(300) NOT NULL
);

CREATE TABLE auditorium (
    id UUID PRIMARY KEY,
    cinema_id UUID NOT NULL REFERENCES cinema(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    UNIQUE(cinema_id, name)
);

CREATE TABLE seat (
    id UUID PRIMARY KEY,
    auditorium_id UUID NOT NULL REFERENCES auditorium(id) ON DELETE CASCADE,
    row_label VARCHAR(8) NOT NULL,
    seat_number INTEGER NOT NULL CHECK (seat_number > 0),
    seat_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    price_modifier NUMERIC(12,2) NOT NULL DEFAULT 0,
    UNIQUE(auditorium_id, row_label, seat_number)
);

CREATE TABLE showtime (
    id UUID PRIMARY KEY,
    movie_id UUID NOT NULL REFERENCES movie(id) ON DELETE RESTRICT,
    auditorium_id UUID NOT NULL REFERENCES auditorium(id) ON DELETE RESTRICT,
    start_time TIMESTAMPTZ NOT NULL,
    base_price NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
);

CREATE INDEX idx_showtime_movie_start ON showtime(movie_id, start_time);
CREATE INDEX idx_seat_auditorium ON seat(auditorium_id);

CREATE TABLE booking (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
    showtime_id UUID NOT NULL REFERENCES showtime(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMPTZ
);

CREATE INDEX idx_booking_user_created ON booking(user_id, created_at DESC);
CREATE INDEX idx_booking_pending_expiry ON booking(status, expires_at);

CREATE TABLE booking_seat (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
    showtime_id UUID NOT NULL REFERENCES showtime(id) ON DELETE RESTRICT,
    seat_id UUID NOT NULL REFERENCES seat(id) ON DELETE RESTRICT,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    CONSTRAINT uq_showtime_seat_reserved UNIQUE(showtime_id, seat_id)
);

CREATE INDEX idx_booking_seat_booking ON booking_seat(booking_id);
CREATE INDEX idx_booking_seat_showtime ON booking_seat(showtime_id);

CREATE TABLE payment (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL,
    status VARCHAR(20) NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    provider_transaction_id VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMPTZ
);

CREATE INDEX idx_payment_booking ON payment(booking_id);
CREATE UNIQUE INDEX uq_payment_provider_txn
    ON payment(provider, provider_transaction_id)
    WHERE provider_transaction_id IS NOT NULL;
