# CineBooking V17 - Booking payment creation fix

## Symptom

Pressing **Thanh toán** after successfully holding a seat returned a generic data-conflict error. PostgreSQL logged SQLSTATE `23502` because `booking.created_at` was inserted as `NULL`.

## Root cause

`BookingService#create` assigned a UUID to a brand-new `Booking` before the first `Repository.save(...)`. For Spring Data JPA entities without a version property, a non-null id can make the entity look non-new and route the call through merge semantics instead of the normal persist path. In the failing requests, the `@PrePersist` timestamp initialisation did not populate the inserted row, while Hibernate still included `created_at = NULL` in the INSERT. The database column default therefore could not help.

## Fix

V17 applies defence in depth:

1. A new booking is left with `id == null`; `@PrePersist` generates the UUID.
2. `BookingService` explicitly sets one `bookingCreatedAt` timestamp before the first save.
3. The first write uses `saveAndFlush(...)`, so timestamp/constraint failures occur before voucher, points and concession processing continues.
4. `V17__booking_created_at_integrity.sql` adds a PostgreSQL `BEFORE INSERT` guard that fills `created_at` if an application bug ever sends NULL again.
5. Nested validation is moved to `List<@Valid ConcessionItemRequest>` to remove the Hibernate Validator container warning.

No existing bookings are deleted and no database volume reset is required.
