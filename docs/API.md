# API chính

## Public

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/movies`
- `GET /api/movies/{id}`
- `GET /api/showtimes?movieId=...`
- `GET /api/showtimes/{id}`
- `GET /api/showtimes/{id}/seats`

## User (Bearer token)

- `POST /api/showtimes/{id}/holds` body `{ "seatIds": ["uuid"] }`
- `DELETE /api/showtimes/{id}/holds`
- `POST /api/bookings` body `{ "showtimeId": "uuid", "seatIds": ["uuid"] }`
- `GET /api/bookings/me`
- `GET /api/bookings/{id}`
- `POST /api/payments/bookings/{id}/start` body `{ "provider": "MOCK|VNPAY|MOMO" }`
- `POST /api/payments/bookings/{id}/mock/success`
- `POST /api/payments/bookings/{id}/mock/fail`
- `GET /api/tickets/{bookingId}`
- `GET /api/tickets/{bookingId}/qr`

## Payment callbacks

- `GET /api/payments/vnpay/ipn`
- `GET /api/payments/vnpay/return`
- `POST /api/payments/momo/ipn`

## Admin

- `POST /api/admin/movies`
- `POST /api/admin/showtimes`
- `GET /api/admin/bookings`
- `POST /api/admin/bookings/expire-now`

## Realtime

STOMP broker WebSocket endpoint: `/ws`.
Topic: `/topic/showtimes/{showtimeId}/seats`.
