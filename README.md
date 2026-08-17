## V28 - CI/CD + automated integration tests + Testcontainers

V28 adds a GitHub Actions quality gate on top of the V27.2 database-safety baseline:

- Java 25 backend unit tests on every push / pull request.
- PostgreSQL 18.4 + Redis 8.8 Testcontainers integration tests.
- Flyway V25 verification against a real temporary PostgreSQL instance.
- End-to-end register -> login -> JWT -> protected profile test.
- Frontend ESLint advisory check + mandatory optimized Next.js production build.
- V26-V28 source-regression checks and Docker Compose validation.
- Backend/frontend Docker image build validation after all test gates pass.
- Test reports, backend JAR and standalone frontend uploaded as CI artifacts.
- Dependabot for Maven, npm, GitHub Actions and Dockerfiles.

V28 has **no new Flyway migration** and does not require recreating PostgreSQL. See `docs/V28_CI_CD_TESTCONTAINERS.md` and `UPGRADE_V28.md`.

Local structural check:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v28.ps1
```

The full Testcontainers suite runs with Maven + Docker using:

```bash
cd backend
mvn -B -ntp verify -Pci-integration
```

## V27.1 - Windows PowerShell runtime compatibility hotfix

- Removes critical reliance on captured `docker compose exec` stdout in V27 diagnostics/verification tests.
- `flyway_schema_history` is now optional for backup safety; when present in the source DB, the restore smoke test requires it to round-trip.
- `pg_restore --list` validation now runs fully inside the PostgreSQL container.

# 🎬 CineBooking Pro

## Bản vá Admin 403 / Poster Upload

Nếu Dashboard Admin từng hiện toàn bộ số liệu = 0 và thông báo `403`, nguyên nhân phổ biến là trình duyệt giữ JWT của một CineBooking cũ trên cùng `http://localhost`. Bản này dùng storage key mới, xác minh phiên bằng `/api/me`, trả 401 rõ ràng cho token hết hạn/sai và tự yêu cầu đăng nhập lại. Xem `docs/ADMIN_403_FIX.md`.


Đồ án **hệ thống đặt vé xem phim đa nền tảng chịu tải cao** theo hướng Web-first/PWA.

## Feature Pack V24 — High-Traffic Booking & Idempotent Checkout

- `POST /api/bookings` hỗ trợ `Idempotency-Key`: retry cùng nội dung trả lại đúng booking cũ, không tạo đơn trùng.
- Lưu SHA-256 request fingerprint; dùng lại cùng key cho payload khác trả `409 Conflict`.
- Redis Lua giữ ghế atomically, PostgreSQL `uq_showtime_seat_active` là lớp bảo vệ cuối chống bán trùng.
- Race chạm unique index ghế được chuyển thành `409` thân thiện thay vì `500`.
- Có smoke test V24, diagnostic invariant và k6 test riêng cho idempotency retry / tranh chấp cùng một ghế.

Chi tiết: `docs/FEATURE_PACK_V24.md`.

## Feature Pack V20 — Analytics V2 & heatmap vận hành

- Dashboard `/admin/analytics` có KPI doanh thu, AOV, occupancy, payment success, refund rate, check-in và user mới.
- Lọc theo 7/30/90/365 ngày và theo từng rạp.
- Hiệu suất theo rạp và top suất chiếu: doanh thu, booking, vé, sức chứa, tỷ lệ lấp đầy.
- Heatmap vị trí ghế, nhu cầu theo khung giờ và hiệu suất check-in nhân viên.
- Phân bố trạng thái booking/payment và giữ lại top phim, payment provider, bắp nước.
- Flyway V20 chỉ thêm index phục vụ truy vấn báo cáo, không sửa dữ liệu nghiệp vụ.

Chi tiết: `docs/FEATURE_PACK_V20.md`.

## Feature Pack V19 — kho bắp nước transactional

- Admin quản lý tồn kho tại `/admin/inventory`: tồn thực tế, đang giữ, khả dụng, ngưỡng sắp hết và hết hàng.
- Booking `PENDING` giữ tồn kho; huỷ/hết hạn/payment fail tự trả lượng giữ.
- Payment `SUCCESS` mới xuất kho thật; refund được duyệt hoàn kho đúng một lần.
- `inventory_movement` lưu sổ RESTOCK / ADJUSTMENT / RESERVE / RELEASE / SALE / REFUND để audit.
- Trang đặt vé hiển thị số lượng còn lại và khóa nút `+` khi bắp nước/combo hết hàng.

Chi tiết: `docs/FEATURE_PACK_V19.md`.

## Feature Pack V10 — nhân viên, xếp ca, chấm công & kiểm soát cổng vé

Bản hiện tại gồm toàn bộ V8/V9 và bổ sung:

- Admin tạo/chỉnh sửa tài khoản `STAFF / MANAGER` tại `/admin/staff`, phân rạp và khóa tài khoản.
- Admin/Manager xếp ca tại `/admin/shifts`; Manager chỉ xếp `STAFF` cùng rạp.
- Chặn ca trùng giờ và hỗ trợ ca qua đêm.
- Nhân viên xem lịch, bắt đầu/kết thúc ca tại `/staff/schedule`.
- Quét QR tại `/staff/check-in` chỉ khi nhân viên đang trong ca và vé thuộc đúng rạp.
- Audit log cho tạo/sửa/hủy ca, chấm công và check-in vé.
- ADMIN giữ quyền check-in khẩn cấp không cần ca.
- QR ticket ký HMAC, refund workflow, Seat Layout Editor, RBAC, Argon2id và Redis login rate limiting từ V8.

Chi tiết: `docs/FEATURE_PACK_V10.md`.

## Stack

- Next.js 16.3 + React 19.2 + TypeScript + Tailwind CSS 4
- Expo SDK 57 + React Native 0.86 (ứng dụng bonus Android/iOS)
- Java 25 + Spring Boot 4.1
- PostgreSQL 18.4
- Redis 8.8
- WebSocket/STOMP
- Nginx load balancing 2 backend instances
- Mock Payment + VNPay Sandbox + MoMo Sandbox adapters
- QR ticket (ZXing)
- Docker Compose
- k6 load test / contention test

## Điểm kỹ thuật chính

- Redis Lua script giữ **nhiều ghế atomically** trong 300 giây.
- PostgreSQL có `UNIQUE(showtime_id, seat_id)` để bảo vệ invariant không bán trùng.
- Booking `PENDING` tự hết hạn; job xóa reservation và trả ghế.
- Realtime seat event qua WebSocket/STOMP; Redis Pub/Sub đồng bộ event giữa nhiều backend instance.
- Backend stateless JWT nên có thể scale ngang sau Nginx.
- PWA chạy trên desktop/mobile và có thể Add to Home Screen.

## Chạy nhanh

### 1. Chuẩn bị

Cần Docker + Docker Compose.

Trên Windows/PowerShell, tạo `.env` và sinh `JWT_SECRET` ngẫu nhiên 256-bit:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\init-env.ps1
```

Trên Linux/macOS có thể copy thủ công `.env.example` sang `.env`, sau đó đặt `JWT_SECRET` bằng một secret ngẫu nhiên tối thiểu 32 bytes.
Docker Compose V26.1 sẽ **từ chối khởi động backend nếu `JWT_SECRET` bị thiếu/rỗng**; backend cũng chặn giá trị mẫu mặc định.

**Đổi ngay** `ADMIN_PASSWORD` nếu triển khai ngoài máy local. Không commit `.env` lên Git.

### 2. Khởi động

```bash
docker compose up --build
```

Mở:

- App: `http://localhost`
- Health backend: `http://localhost/api/../actuator/health` (qua trực tiếp backend nếu expose riêng; mặc định Nginx chỉ route `/api`)

Tài khoản admin mặc định trong `.env.example`:

- Email: `admin@cine.local`
- Password: `Admin@123`

### 3. Demo user

Có thể tạo tài khoản mới ở `/register`.

Dữ liệu demo hiện có **8 phim đang chiếu** (đủ 2 hàng desktop), 1 rạp, 5 phòng và lịch chiếu hằng ngày đến hết **30/09/2026**. V29.3 bổ sung 4 phòng demo và 704 suất chiếu xác định trước mà không sửa các migration Flyway cũ.


## PostgreSQL 18 / SQL / tạo CSDL

Dự án dùng PostgreSQL 18 và Flyway. Với PostgreSQL Docker Official Image **18+**, volume phải mount ở `/var/lib/postgresql` (không còn dùng `/var/lib/postgresql/data` như các bản cũ). File `docker-compose.yml` của bản này đã được sửa theo layout mới.

SQL nằm tại:

```text
backend/src/main/resources/db/migration/
├── V1__init.sql       # tạo schema/tables/index/constraints
└── V2__seed_demo.sql  # dữ liệu demo
```

Khi `postgres` healthy, Spring Boot kết nối database và Flyway tự chạy `V1` rồi `V2`. Không cần import SQL thủ công nếu chạy bằng Docker Compose.

PostgreSQL Docker được expose mặc định ra host:

```text
Host:     localhost
Port:     5433
Database: cinebooking
User:     cinebooking
Password: cinebooking
```

Xem thêm `database/README.md`.

## Thanh toán

### MOCK

Mặc định dùng `MOCK`, không cần credentials. Đây là cách tốt nhất để demo offline hoặc khi bảo vệ đồ án.

### VNPay Sandbox

Điền:

```env
VNPAY_TMN_CODE=...
VNPAY_HASH_SECRET=...
VNPAY_RETURN_URL=http://your-host/payment/result
VNPAY_IPN_URL=https://public-host/api/payments/vnpay/ipn
```

VNPay callback/IPN phải truy cập được từ internet khi test server-to-server.

### MoMo Sandbox

Điền:

```env
MOMO_PARTNER_CODE=...
MOMO_ACCESS_KEY=...
MOMO_SECRET_KEY=...
MOMO_REDIRECT_URL=http://your-host/payment/result
MOMO_IPN_URL=https://public-host/api/payments/momo/ipn
```

## Test tranh chấp một ghế

Cài k6, sau đó xác định một `SEAT_ID` còn trống.

```bash
k6 run \
  -e BASE_URL=http://localhost/api \
  -e SHOWTIME_ID=55555555-5555-5555-5555-555555555555 \
  -e SEAT_ID=<uuid-ghe> \
  -e VUS=100 \
  loadtest/contention.js
```

Threshold `hold_success: count==1` và `booking_success: count==1` yêu cầu **chỉ đúng một người giữ được ghế và chỉ đúng một booking thành công**.

> Sau một lần test, ghế thắng cuộc đang nằm trong booking PENDING. Reset volume hoặc chọn ghế khác trước khi chạy lại.

## Load test 1.000 users

```bash
k6 run -e BASE_URL=http://localhost/api loadtest/high-traffic.js
```

Mặc định ramp lên 1.000 VU và kiểm tra:

- error rate < 1%
- p95 < 800ms
- p99 < 1500ms

Các threshold là mục tiêu demo, không phải cam kết production; kết quả phụ thuộc CPU/RAM/mạng của máy chạy.

## Cấu trúc thư mục

```text
cinebooking-pro/
├── backend/                 Spring Boot API
├── frontend/                Next.js PWA
├── mobile/                  Expo/React Native bonus app
├── infra/nginx/             Load balancer/reverse proxy
├── loadtest/                k6 scripts
├── docs/                    Kiến trúc, ERD, API, kịch bản demo
├── docker-compose.yml
└── .env.example
```

## Luồng nghiệp vụ

```text
Chọn suất chiếu
  -> Xem seat map
  -> Chọn ghế
  -> Redis atomic hold (TTL 5 phút)
  -> Tạo booking PENDING + DB unique reservation
  -> Chọn MOCK / VNPay / MoMo
  -> Payment success
  -> Booking CONFIRMED
  -> Phát hành QR ticket
```

Nếu payment fail hoặc booking hết hạn, `booking_seat` bị xóa và ghế mở lại.

## Lưu ý production

Đây là bản đồ án/portfolio có kiến trúc tốt để demo và benchmark. Trước khi dùng thật nên bổ sung thêm:

- TLS/HTTPS thực tế, secret manager, rotation key.
- Refresh token / token revocation hoặc OAuth2/OIDC.
- WAF / reverse-proxy hardening và rate limit theo IP ở edge. (Login rate limiting + audit log đã có trong V8.)
- Outbox/event broker cho email/notification/payment event.
- PostgreSQL HA/replication, Redis Sentinel/Cluster nếu cần.
- Observability đầy đủ: Prometheus, Grafana, OpenTelemetry.
- Idempotency-Key cho API tạo booking/payment.
- Testcontainers/integration tests và CI/CD.
- Tích hợp máy quét chuyên dụng/offline sync cho cổng soát vé. (QR ký HMAC + check-in một lần đã có trong V8.)

## Tài liệu

- `docs/ARCHITECTURE.md`
- `docs/ERD.md`
- `docs/API.md`
- `docs/DEMO_SCRIPT.md`

## Bonus mobile Android/iOS

Thư mục `mobile/` là app Expo SDK 57 dùng chung backend.

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
```

Trên điện thoại thật, sửa `EXPO_PUBLIC_API_URL` thành IP LAN của máy đang chạy Docker, ví dụ `http://192.168.1.10/api`. Không dùng `localhost` vì khi đó localhost là chính điện thoại.

## Observability (tùy chọn)

Chạy thêm Prometheus + Grafana:

```bash
docker compose --profile observability up --build
```

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (`admin` / `admin` trong môi trường demo)

Prometheus scrape trực tiếp `/actuator/prometheus` của cả `backend-1` và `backend-2`, phù hợp để trình bày latency, throughput, JVM và HTTP metrics khi chạy k6.

## Spring Boot 4 + Flyway note

Spring Boot 4 modularized Flyway auto-configuration. This project therefore uses
`spring-boot-starter-flyway` plus `flyway-database-postgresql`. If the database is
empty and the backend reports `Schema validation: missing table [app_user]`, rebuild
the backend image so the Flyway starter is included:

```powershell
docker compose up -d --build backend-1 backend-2
docker compose logs -f backend-1
```

On a successful first startup you should see Flyway create `flyway_schema_history`
and apply `V1__init.sql` and `V2__seed_demo.sql` before Hibernate schema validation.

---

## Full account / admin / payment features (added)

### Account
- Register from `/login` or `/register`.
- Forgot password: `/forgot-password`.
- Reset password tokens are SHA-256 hashed in `password_reset_token`, single-use, default TTL 30 minutes.
- Local development: `DEV_RESET_LINK=true` returns a local reset link so SMTP is not required.
- Production email: set `MAIL_ENABLED=true` and configure the `MAIL_*` variables.
- Profile: `/profile` lets a signed-in user update full name, phone and change password.

### Admin
`/admin` now has CRUD screens for:
- Movies (delete is a safe hide/soft-delete)
- Cinemas
- Auditoriums
- Showtimes
- Seats
- Users / roles
- Booking overview

Destructive deletes are rejected when database relations make deletion unsafe (for example, a seat already used by a booking).

### Payment providers
Supported `provider` values:
- `MOCK`
- `VNPAY`
- `VNPAY_QR`
- `MOMO`
- `MOMO_QR`

`VNPAY_QR` creates a VNPAY payment URL with `vnp_BankCode=VNPAYQR`.
`MOMO_QR` uses MoMo `captureWallet`, stores `qrCodeUrl` payload and renders it as a QR on `/payment/qr`.

#### VNPAY Sandbox
Fill in `.env`:
```env
VNPAY_TMN_CODE=YOUR_SANDBOX_TMN_CODE
VNPAY_HASH_SECRET=YOUR_SANDBOX_HASH_SECRET
VNPAY_RETURN_URL=http://localhost/payment/result
VNPAY_IPN_URL=https://YOUR_PUBLIC_HTTPS_HOST/api/payments/vnpay/ipn
```
For local-only browser testing the return URL may use localhost. For true server-to-server IPN, use a public HTTPS URL and configure the same IPN endpoint in the VNPAY merchant/sandbox configuration.

#### MoMo Sandbox
Fill in `.env`:
```env
MOMO_PARTNER_CODE=YOUR_PARTNER_CODE
MOMO_ACCESS_KEY=YOUR_ACCESS_KEY
MOMO_SECRET_KEY=YOUR_SECRET_KEY
MOMO_REDIRECT_URL=http://localhost/payment/result
MOMO_IPN_URL=https://YOUR_PUBLIC_HTTPS_HOST/api/payments/momo/ipn
```
For direct QR display, the frontend uses the `qrCodeUrl` payload returned by MoMo. Production merchants may need MoMo permission for QR/deeplink response fields.

### Apply new database migrations
If your database is already at Flyway version 2, rebuild/restart the backend. Flyway will apply:
- `V3__user_profile_and_password_reset.sql`
- `V4__payment_checkout_fields.sql`

```powershell
docker compose up -d --build backend-1 backend-2

docker compose logs -f backend-1
```
Then verify:
```powershell
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history ORDER BY installed_rank;"
```

## Upload poster từ máy

Admin có thể upload JPG/PNG/WebP trực tiếp ở tab **Phim**. File được lưu trong `./uploads/movies` và hai backend dùng chung thư mục này. Xem `docs/POSTER_UPLOAD.md`.

## Full cinema backgrounds

The site now uses `frontend/public/backgrounds/cinema-main.png` as the full-page background. Seat-booking routes (`/booking/[showtimeId]`) automatically switch to `frontend/public/backgrounds/cinema-booking-red.png`. See `docs/CINEMA_BACKGROUND_IMAGES.md`.

## Feature Pack V6

- Phim yêu thích và trang `/favorites`.
- Đánh giá phim 1-5 sao, điểm trung bình và bình luận thành viên.
- Admin kiểm duyệt review tại `/admin/reviews`.
- Thành viên BRONZE/SILVER/GOLD/DIAMOND và tích điểm sau payment thành công.
- Flyway `V6__engagement_and_loyalty.sql`; không cần xóa database cũ.

Chi tiết: `docs/FEATURE_PACK_V6.md`.

## Feature Pack V7 – Commerce, Voucher, Notification, Analytics

Bản này bổ sung quy trình thương mại hoàn chỉnh hơn cho CineBooking:

- Cine Food: bắp nước/combo đi cùng booking.
- Voucher phần trăm hoặc số tiền cố định.
- Dùng điểm thành viên để giảm giá và hoàn điểm khi booking hết hạn.
- Notification Center + nhắc giờ chiếu chống gửi trùng trên nhiều backend instance.
- Admin quản lý bắp nước/voucher tại `/admin/commerce`.
- Dashboard doanh thu tại `/admin/analytics`.
- Flyway migration `V7__commerce_vouchers_notifications_analytics.sql`.

Xem `docs/FEATURE_PACK_V7.md` để biết chi tiết.

## V9 - Employee accounts

Admin can manage dedicated STAFF/MANAGER accounts at `/admin/staff`, including cinema assignment, employee code, employment status, login enable/disable and password reset. See `docs/FEATURE_PACK_V9.md`.

## V21 - Security & Session Management

V21 adds revocable multi-device login sessions with short-lived access JWTs and rotating HttpOnly refresh-token cookies. Users can review/revoke devices from **Tài khoản → Bảo mật & thiết bị**; Admin can inspect/revoke a user's sessions through `/api/admin/security`. Password reset revokes all sessions, password change revokes other devices, and disabling/deleting staff revokes active sessions immediately. Nginx also adds baseline browser security headers.

After upgrading, existing V20 access tokens intentionally require one fresh login because V21 access tokens include a server-side session id (`sid`). Local HTTP keeps `REFRESH_COOKIE_SECURE=false`; production HTTPS should set it to `true`.

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v21.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v21.ps1
```

## V22 - Notification Center V2

V22 adds per-user notification channels and category preferences. The existing bell/in-app feed now supports optional SMTP email delivery, browser notifications while CineBooking is open, booking/refund/showtime/staff-shift categories, a test-notification action, and staff shift assignment/update/cancellation reminders. Scheduled shift reminders are deduplicated in PostgreSQL so the two backend instances cannot create duplicate reminders.

Flyway migration: `V22__notification_center_v2.sql`. Run `tools/diagnose-v22.ps1` and `tools/test-v22.ps1` after upgrading. Existing database data is preserved; do **not** use `docker compose down -v` for this upgrade.

## V23 - Attendance V2, Leave & Timesheet

V23 upgrades staff operations with attendance quality metrics (`late_minutes`, `early_leave_minutes`, `worked_minutes`, punctuality status), employee leave requests/approval, approved-leave shift blocking, and a monthly timesheet dashboard for Manager/Admin. Staff manage leave from `/staff/schedule`; Manager/Admin use `/admin/attendance`.

Flyway migration: `V23__attendance_leave_timesheet.sql`. Run `tools/diagnose-v23.ps1` and `tools/test-v23.ps1` after upgrading. Existing booking/payment/inventory data is preserved; do **not** use `docker compose down -v` when keeping the current database.

## V26.2 PWA manifest runtime fix

If Windows PowerShell reports `Manifest display must be standalone (actual: '')` even though `/manifest.webmanifest` returns HTTP 200, use the V26.2 static-manifest patch. See `docs/V26_2_MANIFEST_RUNTIME_FIX.md`.


## V27.2 - Windows PowerShell restore smoke-test fix

V27.2 keeps the V27 backup/restore safety design and fixes the non-destructive restore smoke test on Windows PowerShell 5.1. The public-table count query is now executed from a temporary SQL file in the existing `./backups:/backups` mount instead of embedding `count(*)` inside nested `sh -lc` command substitution. See `docs/V27_2_RESTORE_PROBE_FIX.md`.

## V28.1 local-artifact verifier hotfix

V28.1 allows the expected local `.env` and V27 `backups/*.dump` files to exist while ensuring they are not tracked by Git. This removes a Windows/local diagnostic false-positive without weakening source-control leak protection. See `UPGRADE_V28_1.md`.


## V28.4 CI docs-regression fix

V28.4 makes the V27 safety verifier Markdown-aware so the documented warning against `docker compose down -v` is recognized correctly by CI even when **not** is Markdown-bold. No runtime or database behavior changes.

## V28.5 CI V27 Git/local-artifact verifier fix

V28.5 makes the V27 safety regression Git-aware: local `.env` and `backups/*.dump` files are allowed but must remain untracked, and Markdown-formatted warnings against `docker compose down -v` are recognized correctly. No runtime/database behavior changes.


## V28.6 CI V27 documentation-scope fix

V28.6 removes a false-positive that required the V27 `docker compose down -v` warning to be duplicated in the root README. The dedicated V27 backup/restore guide remains the source of truth for that safety warning.

## V29.2 - Playwright browser E2E

V29.2 adds a Chromium release-candidate E2E journey through nginx: register, explicit login, Quick Booking, seat hold, MOCK payment, ticket QR, and `/staff/check-in` confirmation through the disposable RC Admin gate. The normal CI remains the fast source/build/Testcontainers gate; the manual Release Candidate workflow owns the heavier browser test and uploads Playwright report/trace evidence. See `docs/V29_2_PLAYWRIGHT_E2E.md`.

## V29.3 demo catalog and September 2026 schedule

V29.3 adds a Flyway-safe demo data migration with eight active movies (two complete desktop rows), four additional demo auditoriums, and two daily showtimes per movie through 2026-09-30. The current Testcontainers integration test validates Flyway V29 and verifies September 30 coverage. See `docs/V29_3_DEMO_CATALOG_SEPTEMBER_SCHEDULE.md`.

## V30 - Movie Discovery & Showtime Calendar

V30 improves the customer browsing flow without changing the booking API or database schema. `/movies` now has advanced filters and sorting, `/cinemas` exposes the complete schedule instead of only 14 days, and movie-detail pages provide date-based showtime navigation. See `docs/V30_MOVIE_DISCOVERY_SHOWTIME_CALENDAR.md` and `UPGRADE_V30.md`.

## V31 - Ticket Wallet & Calendar

V31 turns `/bookings` into a searchable/filterable ticket wallet and adds authenticated `.ics` calendar export for confirmed tickets. The e-ticket page also supports calendar download, booking-id copy, and print-friendly output. No database migration is required. See `docs/V31_TICKET_WALLET_CALENDAR.md` and `UPGRADE_V31.md`.


## V31.2 — Release Candidate determinism

V31.2 hardens the real Chromium release-candidate path: booking status assertions use an unambiguous accessible locator, concurrent admin bootstrap is replica-safe, and disposable smoke/E2E stacks verify that both backend replicas remain running. See `UPGRADE_V31_2.md`.
