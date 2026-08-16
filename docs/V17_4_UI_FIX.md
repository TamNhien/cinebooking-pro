# CineBooking Pro V17.4 - Navigation drawer + Booking modal UI fix

## Changes

### Navigation drawer
- Removes the duplicate Sign out button from inside the hamburger drawer for authenticated users. Sign out remains in the main header.
- Each main drawer group is now one bordered card. The card automatically grows to contain its submenu when expanded.
- Only one drawer group is expanded at a time; clicking its main row toggles it.
- Existing outside-click / Escape / route-change close behavior is preserved.

### Admin booking detail
- Booking detail is rendered with a React portal directly under `document.body` instead of inside `<main>`.
- This removes the stacking-context problem that allowed the sticky site header/footer to cover the top or bottom of the dialog.
- The modal is constrained to the physical viewport and has its own vertical scroll area.
- Background page scrolling is locked while the modal is open.
- Escape and backdrop click close the dialog.
- On mobile, the modal becomes full-screen and respects safe-area insets.

## Upgrade

This patch changes frontend only. No Flyway migration or backend rebuild is required.

```powershell
docker compose up -d --build --force-recreate frontend nginx
```

Then hard-refresh the browser (`Ctrl + F5`).
