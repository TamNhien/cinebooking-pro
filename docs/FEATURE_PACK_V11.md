# CineBooking Pro V11 - Mobile QR Check-in + Shift Fix

## 1. Shift bug fixed

V10 created a database UNIQUE constraint on `(staff_user_id, shift_date, start_time)`. A cancelled shift remained in the table, so creating the same slot again raised a database conflict even though business overlap logic ignored `CANCELLED` shifts.

V11 migration `V11__mobile_qr_checkin_and_shift_fix.sql` removes that constraint and replaces it with a partial unique index for non-cancelled shifts only. Cancelled shifts stay in audit/history but no longer reserve the slot.

The admin shift UI hides cancelled shifts by default, can show them on demand, displays status badges, and shows tickets scanned per shift.

## 2. QR is now a URL

Ticket QR now contains an absolute signed URL:

`http(s)://host/staff/check-in?ticket=CINEBOOKING%7CV1%7C...`

The signed ticket token remains HMAC protected. `TicketTokenService` accepts both legacy raw V10 payloads and V11 URLs, so old QR payloads remain compatible.

A normal phone Camera/Google Lens can open the URL. If the staff user is not logged in, CineBooking redirects to login and returns to the same ticket URL. If staff has not started a shift, the check-in page provides a link to attendance and returns to the pending ticket after starting the shift.

## 3. Real-phone LAN demo

If QR is generated with `http://localhost`, another phone cannot open it. Configure:

`TICKET_PUBLIC_BASE_URL=http://<PC-LAN-IP>`

or run on Windows PowerShell:

`powershell -ExecutionPolicy Bypass -File .\tools\set-lan-qr-url.ps1`

Then recreate only backend containers:

`docker compose up -d --force-recreate backend-1 backend-2`

The phone and PC must be on the same network, and Windows Firewall must allow TCP port 80.

The V11 URL-flow does not require browser camera permission: the phone's normal camera reads the QR and opens the web URL. The in-page camera still generally requires HTTPS on real phones.

## 4. Scan history

Migration V11 adds `ticket_checkin_log`. Every successful scan records booking, staff, cinema, shift/attendance when available, timestamp, source and IP address.

Staff check-in now shows the 50 most recent scans. Shift screens show `checkedTickets` per shift.

## 5. Upgrade

Do not delete the database volume. Copy the V11 patch over V10.3 and run:

`docker compose up -d --build --force-recreate backend-1 backend-2 frontend nginx`

Verify Flyway version 11 and run `tools/test-v11.ps1`.
