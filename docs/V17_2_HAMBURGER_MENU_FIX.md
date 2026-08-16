# CineBooking Pro V17.2 - Hamburger Menu Fix

## Problem
The hamburger button was rendered in the header but could appear to do nothing on some viewport widths.

## Fix
- Replaced the inline collapsible block with a portal-based navigation drawer.
- The drawer is rendered at `document.body`, so header/backdrop-filter stacking contexts cannot hide it.
- Added backdrop click-to-close, close button, Escape-to-close, route-change close, and body scroll lock.
- The button now always has a real function on desktop and mobile.
- Menu contents are role-aware for USER, STAFF, MANAGER, and ADMIN.
- Mobile login/logout remains accessible inside the drawer.
- Added `aria-expanded`, dialog semantics, focus-visible styling, and reduced-motion support.

## Test
1. Click the hamburger button in the header.
2. Confirm the right-side drawer opens.
3. Click outside the drawer: it closes.
4. Open it and press Escape: it closes.
5. Open it and navigate to any menu item: it closes after navigation.
6. Test USER, STAFF, MANAGER, and ADMIN accounts to confirm role-specific links.
