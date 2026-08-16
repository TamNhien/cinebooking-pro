# CineBooking Pro V25 - Recommendation Engine

V25 adds a hybrid recommendation layer without introducing an external AI service. The engine combines content metadata and behavior already owned by CineBooking.

## Signals

Personalized ranking uses:
- confirmed booking history,
- favorites,
- positive reviews (4-5 stars),
- recent clicks/views from recommendation cards,
- movie genre overlap,
- 30-day booking popularity, favorites, review volume/rating and upcoming showtimes.

New users fall back safely to trending recommendations until enough profile signals exist.

## API

- `GET /api/recommendations/home?limit=8&cinemaId=...` - optional personalized home payload.
- `GET /api/recommendations/trending?limit=8&cinemaId=...` - public trending movies.
- `GET /api/recommendations/similar/{movieId}?limit=6` - public related movies.
- `POST /api/recommendations/events` - authenticated CLICK/VIEW feedback.

## Movie metadata

V25 adds `genre`, `movie_language`, and `trailer_url` to `movie`. Admin can edit all three. Existing frontend movie cards/details already had placeholders for this metadata; V25 now serves them from the backend.

## Database

Migration: `V25__recommendation_engine.sql`.

It creates `recommendation_event` and supporting indexes. Two demo movies receive initial genres only when those rows exist.

## Testing

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v25.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v25.ps1
```

The smoke test creates one temporary recommendation CLICK event and removes it before exit. It does not create or alter bookings/payments.
