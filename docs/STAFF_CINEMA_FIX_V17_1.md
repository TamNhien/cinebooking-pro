# CineBooking V17.1 - Staff cinema consistency fix

## Problem
The gate-status screen used the active attendance cinema, while QR authorization checked `staff_profile.cinema_id` first. If a staff profile was transferred while a shift was already active, the UI could say the gate was ready at Cinema A but the QR check could still reject with a profile assignment at Cinema B.

## Fix
During an active attendance, the attendance/shift cinema is authoritative for ticket scanning. `staff_profile.cinema_id` remains the home assignment used when creating future shifts.

No database migration is required.
