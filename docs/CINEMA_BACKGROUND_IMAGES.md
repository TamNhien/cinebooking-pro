# Cinema background images

Two user-provided images are bundled with the frontend:

- `frontend/public/backgrounds/cinema-main.png`: default full-page background for the site.
- `frontend/public/backgrounds/cinema-booking-red.png`: red auditorium background used only on `/booking/[showtimeId]`.

`BackgroundTheme.tsx` watches the Next.js route and toggles `body.booking-background` while the customer is on a seat-booking page.

The backgrounds use a dark gradient overlay so navigation, forms, movie cards and the seat map remain readable. The header/footer/cards are partially transparent so the cinema image stays visible.
