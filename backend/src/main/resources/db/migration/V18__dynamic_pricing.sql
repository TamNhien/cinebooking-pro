-- V18: configurable dynamic ticket pricing.
-- Existing showtime.base_price and seat.price_modifier remain the stable base.
-- Matching pricing rules add a fixed or percentage adjustment at booking time.
-- booking_seat.price continues to snapshot the final price, so later rule changes
-- never rewrite the price of an existing booking.

CREATE TABLE pricing_rule (
    id UUID PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    cinema_id UUID REFERENCES cinema(id) ON DELETE CASCADE,
    auditorium_id UUID REFERENCES auditorium(id) ON DELETE CASCADE,
    movie_id UUID REFERENCES movie(id) ON DELETE CASCADE,
    seat_type VARCHAR(20),
    days_of_week VARCHAR(32),
    start_time TIME,
    end_time TIME,
    valid_from DATE,
    valid_to DATE,
    adjustment_type VARCHAR(20) NOT NULL
        CHECK (adjustment_type IN ('FIXED','PERCENT')),
    adjustment_value NUMERIC(12,2) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_pricing_rule_time_pair CHECK (
        (start_time IS NULL AND end_time IS NULL)
        OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time <> end_time)
    ),
    CONSTRAINT ck_pricing_rule_date_range CHECK (
        valid_from IS NULL OR valid_to IS NULL OR valid_to >= valid_from
    )
);

CREATE INDEX idx_pricing_rule_active_priority
    ON pricing_rule(active, priority DESC, created_at);
CREATE INDEX idx_pricing_rule_cinema ON pricing_rule(cinema_id) WHERE active;
CREATE INDEX idx_pricing_rule_auditorium ON pricing_rule(auditorium_id) WHERE active;
CREATE INDEX idx_pricing_rule_movie ON pricing_rule(movie_id) WHERE active;

-- Inactive examples are intentionally seeded so V18 does not change any current
-- ticket price until an administrator explicitly enables a rule.
INSERT INTO pricing_rule(
    id,name,days_of_week,adjustment_type,adjustment_value,priority,active
) VALUES
('18181818-1818-4818-8818-181818181801','Cuối tuần +15.000đ','6,7','FIXED',15000,20,FALSE),
('18181818-1818-4818-8818-181818181802','Khung giờ tối +10%','1,2,3,4,5,6,7','PERCENT',10,10,FALSE)
ON CONFLICT (id) DO NOTHING;
