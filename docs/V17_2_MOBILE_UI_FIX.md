# CineBooking Pro V17.2 - Hamburger + Mobile Layout Fix

## Fixed
- Hamburger button now opens a portal-based role-aware navigation drawer on desktop and mobile.
- Drawer supports backdrop close, X close, Escape close, route-change close, scroll lock and safe-area padding.
- Header actions are constrained on phones so the hamburger cannot be pushed outside the viewport.
- Profile page always enters at the page top instead of inheriting a stale mobile-browser scroll offset.
- Profile cards become one column on small screens and get phone-safe padding.
- Main/profile/footer add bottom safe-area room so browser toolbars do not visually cover the last form controls.
- Inputs use a 16px mobile font size to avoid browser auto-zoom.
- Horizontal overflow is clipped on phones to prevent the header/page from shifting off-screen.

## Manual test
1. On phone, open `/profile` from another page; verify the title/member cards are visible at the top.
2. Scroll to the bottom; verify the password form and footer can be fully reached above the browser toolbar.
3. Tap `☰`; verify the drawer opens and can scroll independently.
4. Tap outside, tap `X`, navigate via a drawer link, and press Escape on desktop; each should close the drawer.
5. Test USER, STAFF, MANAGER and ADMIN to verify role-specific links.
