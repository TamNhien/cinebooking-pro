ALTER TABLE concession_product
    ADD COLUMN inventory_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN stock_on_hand INTEGER NOT NULL DEFAULT 100 CHECK (stock_on_hand >= 0),
    ADD COLUMN stock_reserved INTEGER NOT NULL DEFAULT 0 CHECK (stock_reserved >= 0),
    ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0);

ALTER TABLE concession_product
    ADD CONSTRAINT chk_concession_reserved_not_over_stock
    CHECK (stock_reserved <= stock_on_hand);

CREATE INDEX idx_concession_inventory_alert
    ON concession_product(inventory_enabled, active, stock_on_hand, stock_reserved, low_stock_threshold);

CREATE TABLE inventory_movement (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES concession_product(id) ON DELETE RESTRICT,
    booking_id UUID REFERENCES booking(id) ON DELETE SET NULL,
    movement_type VARCHAR(24) NOT NULL CHECK (movement_type IN ('RESTOCK','ADJUSTMENT','RESERVE','RELEASE','SALE','REFUND')),
    quantity_delta INTEGER NOT NULL DEFAULT 0,
    reserved_delta INTEGER NOT NULL DEFAULT 0,
    stock_after INTEGER NOT NULL CHECK (stock_after >= 0),
    reserved_after INTEGER NOT NULL CHECK (reserved_after >= 0),
    actor_email VARCHAR(320),
    note VARCHAR(300),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (reserved_after <= stock_after)
);

CREATE INDEX idx_inventory_movement_product_created
    ON inventory_movement(product_id, created_at DESC);
CREATE INDEX idx_inventory_movement_booking
    ON inventory_movement(booking_id, created_at DESC) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_inventory_movement_type_created
    ON inventory_movement(movement_type, created_at DESC);

CREATE UNIQUE INDEX uq_inventory_booking_product_event
    ON inventory_movement(booking_id, product_id, movement_type)
    WHERE booking_id IS NOT NULL AND movement_type IN ('RESERVE','RELEASE','SALE','REFUND');

-- V19 starts inventory accounting from the current deployment state.
-- Existing products receive a safe demo baseline. Historical confirmed bookings are not retroactively deducted.
UPDATE concession_product
SET stock_on_hand = GREATEST(stock_on_hand, 100),
    stock_reserved = 0,
    low_stock_threshold = CASE WHEN low_stock_threshold < 0 THEN 10 ELSE low_stock_threshold END;
