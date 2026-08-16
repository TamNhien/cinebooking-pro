ALTER TABLE booking
    ADD COLUMN seat_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (seat_amount >= 0),
    ADD COLUMN concession_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (concession_amount >= 0),
    ADD COLUMN discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    ADD COLUMN points_redeemed INTEGER NOT NULL DEFAULT 0 CHECK (points_redeemed >= 0),
    ADD COLUMN voucher_code VARCHAR(60),
    ADD COLUMN benefits_refunded BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN reminder_sent BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE booking SET seat_amount = total_amount WHERE seat_amount = 0;

CREATE TABLE concession_product (
    id UUID PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_concession_active_sort ON concession_product(active, sort_order, name);

CREATE TABLE booking_concession (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
    product_id UUID REFERENCES concession_product(id) ON DELETE SET NULL,
    product_name VARCHAR(160) NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0)
);
CREATE INDEX idx_booking_concession_booking ON booking_concession(booking_id);

CREATE TABLE voucher (
    id UUID PRIMARY KEY,
    code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENT','FIXED')),
    discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value > 0),
    min_order_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
    max_discount NUMERIC(12,2) CHECK (max_discount IS NULL OR max_discount >= 0),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit >= 0),
    used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_voucher_active_time ON voucher(active, starts_at, ends_at);

CREATE TABLE voucher_redemption (
    id UUID PRIMARY KEY,
    voucher_id UUID NOT NULL REFERENCES voucher(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE RESTRICT,
    booking_id UUID NOT NULL UNIQUE REFERENCES booking(id) ON DELETE CASCADE,
    discount_amount NUMERIC(12,2) NOT NULL CHECK (discount_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_voucher_redemption_user ON voucher_redemption(user_id, created_at DESC);

CREATE TABLE loyalty_transaction (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES booking(id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('EARN','REDEEM','REFUND')),
    points INTEGER NOT NULL CHECK (points > 0),
    description VARCHAR(300),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_loyalty_tx_user_created ON loyalty_transaction(user_id, created_at DESC);

CREATE TABLE user_notification (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    notification_type VARCHAR(40) NOT NULL,
    title VARCHAR(180) NOT NULL,
    message VARCHAR(500) NOT NULL,
    link_url VARCHAR(300),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notification_user_created ON user_notification(user_id, created_at DESC);
CREATE INDEX idx_notification_user_unread ON user_notification(user_id, is_read) WHERE is_read = FALSE;

INSERT INTO concession_product(id,name,description,price,image_url,active,sort_order) VALUES
('71000000-0000-0000-0000-000000000001','Bắp Caramel','Bắp rang caramel cỡ lớn',59000,NULL,TRUE,10),
('71000000-0000-0000-0000-000000000002','Nước ngọt','Nước ngọt cỡ lớn',39000,NULL,TRUE,20),
('71000000-0000-0000-0000-000000000003','Combo Couple','2 bắp + 2 nước cho hai người',129000,NULL,TRUE,30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO voucher(id,code,name,discount_type,discount_value,min_order_amount,max_discount,usage_limit,used_count,active) VALUES
('72000000-0000-0000-0000-000000000001','WELCOME10','Ưu đãi thành viên mới','PERCENT',10,100000,50000,1000,0,TRUE),
('72000000-0000-0000-0000-000000000002','CINE20K','Giảm 20.000đ','FIXED',20000,150000,NULL,500,0,TRUE)
ON CONFLICT (id) DO NOTHING;
