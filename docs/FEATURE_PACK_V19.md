# CineBooking Pro V19 - Concession Inventory

V19 turns Cine Food from a static catalog into a transactional inventory module.

## Core lifecycle

- Booking PENDING: reserve requested food quantity (`stock_reserved` increases).
- Booking cancelled/expired/payment failed: release the reservation.
- Payment SUCCESS: convert the reservation into a real stock issue (`stock_on_hand` decreases and `stock_reserved` decreases).
- Approved refund: return items to stock if that booking was accounted as a V19 sale.
- Duplicate payment callbacks/refund callbacks are idempotent through a unique inventory event index.

## Admin

`/admin/inventory` provides:

- on-hand / reserved / available stock;
- low-stock and sold-out filters;
- restock and absolute stock adjustment;
- a movement ledger with RESTOCK, ADJUSTMENT, RESERVE, RELEASE, SALE and REFUND events;
- protection against setting stock below quantities already reserved for pending bookings.

Product settings under `/admin/commerce` now include `inventoryEnabled` and `lowStockThreshold`.

## Customer booking

`GET /api/commerce/products` now includes inventory availability. Sold-out items remain visible but cannot be incremented. Low-stock items show their remaining quantity. Backend row locks remain the final authority, so concurrent customers cannot reserve more than available stock.

## Migration

`V19__concession_inventory.sql` adds stock columns and the `inventory_movement` ledger. Existing products start with a demo baseline of 100 units. Historical confirmed bookings are deliberately not retroactively deducted because the project has no reliable opening-stock snapshot for those historical sales.
