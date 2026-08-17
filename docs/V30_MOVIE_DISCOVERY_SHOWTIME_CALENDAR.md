# V30 - Movie Discovery & Showtime Calendar

V30 is a user-facing UX upgrade built on the V29.3 demo catalog and September 2026 schedule.

## Movie discovery

`/movies` now supports combined filters for status, free-text search, genre, language and age rating. Results can be sorted by featured order, community rating, release date, duration or title. The page shows the number of matching movies and provides a one-click reset.

## Full showtime calendar

`/cinemas` no longer truncates the available schedule to the first 14 days. It exposes every date returned by the backend, groups dates by month, offers a native date picker bounded by the actual schedule, and shows the number of movies/showtimes for the selected day.

## Movie-detail schedule navigation

`/movies/[id]` no longer renders every scheduled date at once. The page derives all available dates, lets the customer select one date, and only renders cinemas/showtimes for that day. This keeps the page usable when a movie has many weeks of showtimes.

## Safety / compatibility

- No database schema change is introduced in V30.
- V29's demo schedule migration remains untouched, including showtimes through 2026-09-30.
- Existing booking URLs and API contracts remain unchanged.
- Playwright E2E and V29.3 source gates remain enabled in CI.

## Browser E2E coverage

The manual Release Candidate workflow now executes both the original V29.2 booking journey and a V30 discovery/calendar journey. The V30 test verifies the seeded eight-movie catalog filters, navigates the cinema calendar to 2026-09-30, confirms 16 daily showtimes across eight movies, and verifies that a movie-detail page renders only the selected day's two showtimes.
