-- V48 - Concession & Inventory 2.0
-- Branch-scoped stock and pricing. Legacy concession_product stock columns remain for backwards compatibility,
-- while checkout and inventory operations move to cinema_concession_inventory.

CREATE TABLE cinema_concession_inventory (
    id UUID PRIMARY KEY,
    cinema_id UUID NOT NULL REFERENCES cinema(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES concession_product(id) ON DELETE CASCADE,
    stock_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (stock_on_hand >= 0),
    stock_reserved INTEGER NOT NULL DEFAULT 0 CHECK (stock_reserved >= 0),
    low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
    target_stock INTEGER NOT NULL DEFAULT 50 CHECK (target_stock >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_branch_concession_reserved_not_over_stock CHECK (stock_reserved <= stock_on_hand),
    CONSTRAINT uq_branch_concession_inventory UNIQUE (cinema_id, product_id)
);

CREATE INDEX idx_branch_concession_inventory_alert
    ON cinema_concession_inventory(cinema_id, active, stock_on_hand, stock_reserved, low_stock_threshold);
CREATE INDEX idx_branch_concession_inventory_product
    ON cinema_concession_inventory(product_id, cinema_id);

CREATE TABLE cinema_concession_price (
    id UUID PRIMARY KEY,
    cinema_id UUID NOT NULL REFERENCES cinema(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES concession_product(id) ON DELETE CASCADE,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branch_concession_price UNIQUE (cinema_id, product_id)
);

CREATE INDEX idx_branch_concession_price_lookup
    ON cinema_concession_price(cinema_id, product_id, active);

ALTER TABLE inventory_movement
    ADD COLUMN cinema_id UUID REFERENCES cinema(id) ON DELETE SET NULL,
    ADD COLUMN reference_key VARCHAR(100);

ALTER TABLE inventory_movement DROP CONSTRAINT IF EXISTS inventory_movement_movement_type_check;
ALTER TABLE inventory_movement
    ADD CONSTRAINT inventory_movement_movement_type_check
    CHECK (movement_type IN (
        'RESTOCK','ADJUSTMENT','RESERVE','RELEASE','SALE','REFUND','LOYALTY_REWARD',
        'WASTE','TRANSFER_OUT','TRANSFER_IN'
    ));

CREATE INDEX idx_inventory_movement_cinema_created
    ON inventory_movement(cinema_id, created_at DESC) WHERE cinema_id IS NOT NULL;
CREATE INDEX idx_inventory_movement_reference
    ON inventory_movement(reference_key, created_at DESC) WHERE reference_key IS NOT NULL;

-- Upgrade baseline: the legacy global stock had no branch dimension. Create a safe branch baseline for
-- every existing cinema/product pair; administrators can immediately adjust or transfer per branch.
INSERT INTO cinema_concession_inventory(
    id,cinema_id,product_id,stock_on_hand,stock_reserved,low_stock_threshold,target_stock,active,updated_at
)
SELECT
    md5('v48:branch-inventory:' || c.id::text || ':' || p.id::text)::uuid,
    c.id,p.id,
    GREATEST(COALESCE(p.stock_on_hand,0),0),
    0,
    GREATEST(COALESCE(p.low_stock_threshold,10),0),
    GREATEST(COALESCE(p.stock_on_hand,0),COALESCE(p.low_stock_threshold,10) * 3,30),
    COALESCE(p.active,TRUE),
    CURRENT_TIMESTAMP
FROM cinema c CROSS JOIN concession_product p
ON CONFLICT (cinema_id,product_id) DO NOTHING;

INSERT INTO cinema_concession_price(id,cinema_id,product_id,price,active,updated_at)
SELECT
    md5('v48:branch-price:' || c.id::text || ':' || p.id::text)::uuid,
    c.id,p.id,p.price,TRUE,CURRENT_TIMESTAMP
FROM cinema c CROSS JOIN concession_product p
ON CONFLICT (cinema_id,product_id) DO NOTHING;

-- Attach historical booking-linked movements to their cinema when that relationship can be resolved.
UPDATE inventory_movement im
SET cinema_id = a.cinema_id
FROM booking b
JOIN showtime s ON s.id=b.showtime_id
JOIN auditorium a ON a.id=s.auditorium_id
WHERE im.booking_id=b.id AND im.cinema_id IS NULL;
