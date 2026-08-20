ALTER TABLE app_user
    ADD COLUMN loyalty_lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_lifetime_points >= 0),
    ADD COLUMN birth_date DATE,
    ADD COLUMN birthday_reward_year INTEGER;

UPDATE app_user u
SET loyalty_lifetime_points = GREATEST(
    COALESCE(u.loyalty_points, 0),
    COALESCE((
        SELECT SUM(CASE
            WHEN lt.transaction_type = 'EARN' THEN lt.points
            WHEN lt.transaction_type = 'REVERSAL' THEN -lt.points
            ELSE 0
        END)
        FROM loyalty_transaction lt
        WHERE lt.user_id = u.id
    ), 0)
);

UPDATE app_user
SET membership_tier = CASE
    WHEN loyalty_lifetime_points >= 4000 THEN 'DIAMOND'
    WHEN loyalty_lifetime_points >= 1500 THEN 'GOLD'
    WHEN loyalty_lifetime_points >= 500 THEN 'SILVER'
    ELSE 'BRONZE'
END;

ALTER TABLE app_user
    ADD CONSTRAINT chk_app_user_birth_date
    CHECK (birth_date IS NULL OR birth_date >= DATE '1900-01-01');

ALTER TABLE loyalty_transaction
    DROP CONSTRAINT IF EXISTS loyalty_transaction_transaction_type_check;
ALTER TABLE loyalty_transaction
    ADD CONSTRAINT loyalty_transaction_transaction_type_check
    CHECK (transaction_type IN ('EARN','REDEEM','REFUND','REVERSAL','EXPIRE','REWARD','ADJUST_CREDIT','ADJUST_DEBIT'));
ALTER TABLE loyalty_transaction
    ADD COLUMN expires_at TIMESTAMPTZ,
    ADD COLUMN balance_after INTEGER,
    ADD COLUMN reference_type VARCHAR(40),
    ADD COLUMN reference_id VARCHAR(120);

CREATE TABLE loyalty_point_lot (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    source_transaction_id UUID REFERENCES loyalty_transaction(id) ON DELETE SET NULL,
    original_points INTEGER NOT NULL CHECK (original_points > 0),
    remaining_points INTEGER NOT NULL CHECK (remaining_points >= 0 AND remaining_points <= original_points),
    expires_at TIMESTAMPTZ NOT NULL,
    expired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_loyalty_point_lot_user_expiry
    ON loyalty_point_lot(user_id, expires_at, created_at)
    WHERE remaining_points > 0;
CREATE INDEX idx_loyalty_point_lot_expiry
    ON loyalty_point_lot(expires_at)
    WHERE remaining_points > 0;

INSERT INTO loyalty_point_lot(id,user_id,source_transaction_id,original_points,remaining_points,expires_at,created_at)
SELECT gen_random_uuid(), id, NULL, loyalty_points, loyalty_points, CURRENT_TIMESTAMP + INTERVAL '365 days', CURRENT_TIMESTAMP
FROM app_user
WHERE loyalty_points > 0;

ALTER TABLE voucher
    ADD COLUMN owner_user_id UUID REFERENCES app_user(id) ON DELETE CASCADE;
CREATE INDEX idx_voucher_owner_created ON voucher(owner_user_id, created_at DESC) WHERE owner_user_id IS NOT NULL;

CREATE TABLE loyalty_reward (
    id UUID PRIMARY KEY,
    code VARCHAR(60) NOT NULL UNIQUE,
    name VARCHAR(160) NOT NULL,
    description VARCHAR(500),
    reward_type VARCHAR(20) NOT NULL CHECK (reward_type IN ('VOUCHER','CONCESSION')),
    points_cost INTEGER NOT NULL CHECK (points_cost > 0),
    discount_type VARCHAR(20) CHECK (discount_type IS NULL OR discount_type IN ('PERCENT','FIXED')),
    discount_value NUMERIC(12,2) CHECK (discount_value IS NULL OR discount_value > 0),
    min_order_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (min_order_amount >= 0),
    max_discount NUMERIC(12,2) CHECK (max_discount IS NULL OR max_discount >= 0),
    validity_days INTEGER NOT NULL DEFAULT 30 CHECK (validity_days BETWEEN 1 AND 365),
    concession_product_id UUID REFERENCES concession_product(id) ON DELETE RESTRICT,
    concession_quantity INTEGER CHECK (concession_quantity IS NULL OR concession_quantity > 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (
        (reward_type='VOUCHER' AND discount_type IS NOT NULL AND discount_value IS NOT NULL AND concession_product_id IS NULL)
        OR
        (reward_type='CONCESSION' AND concession_product_id IS NOT NULL AND concession_quantity IS NOT NULL AND discount_type IS NULL AND discount_value IS NULL)
    )
);
CREATE INDEX idx_loyalty_reward_active_sort ON loyalty_reward(active, sort_order, points_cost);

CREATE TABLE loyalty_reward_redemption (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES loyalty_reward(id) ON DELETE RESTRICT,
    voucher_id UUID REFERENCES voucher(id) ON DELETE SET NULL,
    redemption_code VARCHAR(80) NOT NULL UNIQUE,
    points_cost INTEGER NOT NULL CHECK (points_cost > 0),
    status VARCHAR(20) NOT NULL CHECK (status IN ('ISSUED','CLAIMED')),
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    claimed_at TIMESTAMPTZ,
    claimed_by_user_id UUID REFERENCES app_user(id) ON DELETE SET NULL
);
CREATE INDEX idx_loyalty_reward_redemption_user ON loyalty_reward_redemption(user_id, redeemed_at DESC);
CREATE INDEX idx_loyalty_reward_redemption_status ON loyalty_reward_redemption(status, redeemed_at DESC);

ALTER TABLE inventory_movement DROP CONSTRAINT IF EXISTS inventory_movement_movement_type_check;
ALTER TABLE inventory_movement
    ADD CONSTRAINT inventory_movement_movement_type_check
    CHECK (movement_type IN ('RESTOCK','ADJUSTMENT','RESERVE','RELEASE','SALE','REFUND','LOYALTY_REWARD'));

INSERT INTO loyalty_reward(id,code,name,description,reward_type,points_cost,discount_type,discount_value,min_order_amount,max_discount,validity_days,active,sort_order)
VALUES
('74000000-0000-0000-0000-000000000001','RWD20K','Voucher giảm 20.000đ','Đổi điểm lấy voucher cá nhân dùng một lần trong 30 ngày.','VOUCHER',200,'FIXED',20000,100000,NULL,30,TRUE,10),
('74000000-0000-0000-0000-000000000002','RWD10','Voucher giảm 10%','Giảm 10%, tối đa 50.000đ, dùng một lần trong 30 ngày.','VOUCHER',350,'PERCENT',10,120000,50000,30,TRUE,20)
ON CONFLICT (id) DO NOTHING;

INSERT INTO loyalty_reward(id,code,name,description,reward_type,points_cost,concession_product_id,concession_quantity,validity_days,active,sort_order)
VALUES
('74000000-0000-0000-0000-000000000003','RWDCORN','Bắp Caramel miễn phí','Đổi điểm lấy 1 Bắp Caramel. Đưa mã nhận quà cho nhân viên tại quầy.','CONCESSION',300,'71000000-0000-0000-0000-000000000001',1,30,TRUE,30)
ON CONFLICT (id) DO NOTHING;
