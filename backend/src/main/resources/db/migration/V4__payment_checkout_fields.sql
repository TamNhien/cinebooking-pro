ALTER TABLE payment
    ADD COLUMN checkout_url TEXT,
    ADD COLUMN qr_payload TEXT,
    ADD COLUMN deeplink TEXT;
