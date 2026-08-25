# CineBooking Pro V58

CineBooking Pro là hệ thống đặt vé rạp phim full-stack gồm customer booking, payment, QR ticket/check-in, PWA offline ticket, loyalty/voucher, staff operations, analytics, inventory, waitlist, showtime planning, cinema operations và secure ticket transfer.

> **Current release:** V58 - Operations Control Center
> **Backend:** Spring Boot 4.1 / Java 25 / PostgreSQL 18.4 / Redis 8.8
> **Frontend:** Next.js 16.3 / Node.js 24 / Playwright Chromium
> **Runtime:** Docker Compose + nginx load balancing 2 backend replicas

V58 bám đúng roadmap Operations Control Center: dashboard hợp nhất tình trạng rạp từ payment, booking, equipment, staff, support, inventory và incident; cảnh báo được gom theo severity trên một màn hình và làm mới bằng 5-second server snapshot polling. V58 không giả vờ là WebSocket cho các domain chưa có event stream, không tạo cảnh báo giả, không thay đổi trạng thái nghiệp vụ và giữ nguyên contract 57 public tables.

## Quy ước chạy lệnh

Tất cả lệnh test/build/seed trong README này **mặc định chạy từ**:

```text
D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
```


## Chính sách dữ liệu thật và UTF-8

- Database bắt buộc `server_encoding = UTF8`; script runtime kiểm tra cả `server_encoding` và `client_encoding`. `POSTGRES_INITDB_ARGS` chỉ áp dụng khi tạo cluster mới; không xóa volume chỉ để đổi encoding.
- PostgreSQL init mới dùng `--encoding=UTF8`; backend JVM dùng `-Dfile.encoding=UTF-8`; nginx khai báo `charset utf-8`.
- Web giữ `<html lang="vi">`; CSV Analytics trả `text/csv;charset=UTF-8` và CSV export có UTF-8 BOM.
- V52 **không tạo phim giả**. Mọi quan hệ phim tiếp tục tái sử dụng 8 phim V29 đang có trong database.
- `tools/seed-v51-real-data.ps1` không tạo cinema/product/booking/payment giả; nó chỉ tính `analytics_snapshot` từ giao dịch hiện có.
- `cinema_concession_cost_basis` **không được tự bịa giá vốn**. Cost chưa biết thì giữ `NULL`; chỉ nhập/import giá vốn thật.
- `tools/seed-demo-57-tables.ps1` là deterministic CI/reference fixture. `pwa_device` reference chỉ ghi metadata thiết bị tự nhiên với `push_enabled=false`; không bịa endpoint/p256dh/auth. Không dùng fixture này để ghi đè dữ liệu nghiệp vụ thật trên database bạn đang dùng.

## Version history / changelog

Bảng này là chỉ mục cập nhật chính thức theo source hiện tại. Mỗi bản mới phải thêm một dòng ở đây; không dùng roadmap tương lai để mô tả như tính năng đã tồn tại. Những version có migration ghi đúng tên migration; những version frontend/tooling không đổi schema được ghi `Không`.

| Version | Cập nhật chính | Migration / mốc source |
|---|---|---|
| V1 | Khởi tạo schema lõi | `V1__init.sql` |
| V2 | Seed dữ liệu demo ban đầu | `V2__seed_demo.sql` |
| V3 | Hồ sơ người dùng + quên/đặt lại mật khẩu | `V3__user_profile_and_password_reset.sql` |
| V4 | Bổ sung dữ liệu checkout/payment | `V4__payment_checkout_fields.sql` |
| V5 | Backfill ghế mặc định | `V5__backfill_default_seats.sql` |
| V6 | Engagement + loyalty nền tảng | `V6__engagement_and_loyalty.sql` |
| V7 | Commerce, voucher, notification, analytics nền tảng | `V7__commerce_vouchers_notifications_analytics.sql` |
| V8 | Check-in, refund, RBAC, audit vận hành | `V8__operations_checkin_refund_rbac_audit.sql` |
| V9 | Tài khoản nhân viên | `V9__staff_accounts.sql` |
| V10 | Ca làm + chấm công | `V10__staff_shifts_attendance.sql` |
| V11 | Mobile QR check-in + sửa ca làm | `V11__mobile_qr_checkin_and_shift_fix.sql` |
| V12 | Soft-delete nhân viên | `V12__staff_soft_delete.sql` |
| V13 | Index phục vụ booking operations | `V13__booking_operations_indexes.sql` |
| V14 | Nhả ghế khi booking hoàn tiền | `V14__release_refunded_seats.sql` |
| V15 | Lifecycle booking PENDING | `V15__pending_booking_lifecycle.sql` |
| V16 | Tăng tính nhất quán seat reservation | `V16__seat_reservation_consistency.sql` |
| V17 | Bảo toàn `booking.created_at` | `V17__booking_created_at_integrity.sql` |
| V18 | Dynamic pricing | `V18__dynamic_pricing.sql` |
| V19 | Concession inventory | `V19__concession_inventory.sql` |
| V20 | Analytics V2 + read-optimized indexes | `V20__analytics_v2_indexes.sql` |
| V21 | Security sessions | `V21__security_sessions.sql` |
| V22 | Notification Center V2 | `V22__notification_center_v2.sql` |
| V23 | Leave + timesheet + attendance | `V23__attendance_leave_timesheet.sql` |
| V24 | Booking idempotency + contention hardening | `V24__booking_idempotency_and_contention.sql` |
| V25 | Recommendation engine | `V25__recommendation_engine.sql` |
| V26 | PWA / offline-ticket compatibility | Không |
| V27 | Data-safety, backup/verify/restore hardening | Không |
| V28 | CI/runtime/tooling hardening | Không |
| V29 | Demo catalog + lịch chiếu 09/2026 | `V29__demo_movies_and_showtimes_september_2026.sql` |
| V30 | Movie Discovery + Showtime Calendar | Không |
| V31 | Ticket Wallet + Calendar `.ics` | Không |
| V32 | Sold-out Waitlist + seat alerts | `V32__showtime_waitlist.sql` |
| V33 | Showtime Planner | Không |
| V34 | Auditorium maintenance / blackout windows | `V34__auditorium_blackout_windows.sql` |
| V35 | Automated Release Lifecycle | Không |
| V36 | Secure Ticket Transfer + QR rotation | `V36__secure_ticket_transfer.sql` |
| V37 | Payment Gateway Production Ready | `V37__payment_gateway_hardening.sql` |
| V38 | Refund & Cancellation Automation | `V38__refund_cancellation_automation.sql` |
| V39 | Seat Map & Booking UX 2.0 | Không |
| V40 | Loyalty & Membership 2.0 | `V40__loyalty_membership_2.sql` |
| V41 | Notification Center & Engagement Automation 2.0 | `V41__notification_engagement_2.sql` |
| V42 | Financial Ledger & Reconciliation | `V42__financial_ledger_reconciliation.sql` |
| **V42.1** | **Analytics export CSV/XLSX + CI/Release wiring + đồng bộ README/version history** | **Không đổi schema** |
| **V43** | **Staff Operations 2.0 + Analytics CSV/Excel chi tiết theo từng bảng** | **`V43__staff_operations_2.sql`** |
| **V44** | **Cinema Maintenance & Asset Reliability 2.0: asset registry, SLA/work order, incident linkage, immutable history** | **`V44__cinema_maintenance_asset_reliability.sql`** |
| **V45** | **Customer Support & Service Recovery 2.0: ticket/case management, SLA, customer conversation, manager triage, immutable history** | **`V45__customer_support_service_recovery.sql`** |
| **V46** | **Security & Account Protection 2.0: trusted devices, risk-scored alerts, dual email/IP brute-force protection, security dashboards** | **`V46__security_account_protection_2.sql`** |
| **V47** | **Payment Gateway & Operations 2.0: attempt lineage, safe retry/cancel, payment timeline, provider readiness, auto/manual reconciliation** | **`V47__payment_gateway_operations_2.sql`** |
| **V48** | **Concession & Inventory 2.0: multi-cinema stock, branch pricing, waste/transfer operations, branch-scoped checkout reservations** | **`V48__multi_cinema_concession_inventory_2.sql`** |
| **V49** | **Smart Showtime Planning 2.0: demand-balanced multi-room suggestions, occupancy scoring, operating windows, durable planning provenance** | **`V49__smart_showtime_planning_2.sql`** |
| **V50** | **Recommendation Intelligence 2.0: explainable hybrid taste profile, preferred cinema/daypart, explicit MORE/LESS/HIDE feedback** | **`V50__recommendation_intelligence_2.sql`** |
| **V51** | **Analytics & Forecasting 3.0: period comparison, weekday-weighted forecast, margin/cost coverage, branch cost basis, durable scheduled snapshots** | **`V51__analytics_forecasting_3.sql`** |
| **V52** | **PWA / Mobile Experience 3.0: VAPID Background Web Push, controlled cache, PWA devices, owner-scoped offline QR revalidation, persistent storage, mobile UX** | **`V52__pwa_mobile_experience_3.sql`** |
| **V53** | **Operations Command Center 3.0: unified operational pulse, cinema scope, real-data attention signals, V51 forecast reuse** | **Không đổi schema** |
| **V54** | **Multi-Cinema Performance Benchmarking 3.0: equal-window growth, branch revenue ranking/share, occupancy, top movies, V51 forecast reuse** | **Không đổi schema** |
| **V55** | **Customer Retention & Cohort Intelligence 3.0: new/returning customers, repeat rate, lifecycle segmentation, 30-day cohort retention** | **Không đổi schema** |
| **V56** | **Customer Value & RFM Intelligence 3.0: realized lifetime revenue, RFM quintiles, value concentration, privacy-safe top customers** | **Không đổi schema** |
| **V57** | **Booking & Seat Intelligence 3.0: best-seat ranking, contiguous groups, orphan-seat guard, realtime hold countdown, atomic contention, dynamic pricing transparency** | **Không đổi schema** |
| **V58** | **Operations Control Center: payment, booking, equipment, staff, support, inventory, incident; centralized near-realtime alerts** | **Không đổi schema** |

# Cập nhật chi tiết theo phiên bản (tăng dần)

## V26 - PWA / offline-ticket compatibility

V26 has no schema migration. PWA/offline-ticket changes are frontend/service-worker features and preserve the existing database schema.

## V27 - Data Safety / Backup / Restore Hardening

V27 bổ sung quy trình backup, SHA-256 verification, restore probe và guard tránh xóa nhầm volume/database trong quá trình nâng version. Không có migration schema mới.

## V28 - CI / Runtime / Tooling Hardening

V28 củng cố CI, Docker/runtime checks, source manifest và tooling để các bản sau có thể regression ổn định. Không có migration schema mới.

## V29 - Demo catalog và lịch chiếu 09/2026

V29.3 seed 8 phim active để homepage desktop hiển thị đủ **2 hàng × 4 phim**.

Lịch demo:

```text
18/08/2026 → 30/09/2026
8 phim
2 suất/phim/ngày
16 suất/ngày
704 suất mới
```

Migration demo:

```text
V29__demo_movies_and_showtimes_september_2026.sql
```

Không chỉnh sửa migration đã chạy ở production. Nếu cần thay đổi dữ liệu/schema, tạo migration Flyway mới.

---

## V30 - Movie Discovery & Showtime Calendar

- bộ lọc phim nâng cao;
- sort phim;
- calendar theo tháng/ngày;
- chi tiết phim chỉ hiện showtime ngày đang chọn;
- hỗ trợ catalog/lịch demo đến 30/09/2026.

---

## V31 - Ticket Wallet & Calendar

Trang `/bookings` là ví vé gồm:

- upcoming / past / all;
- search booking/movie/seat;
- status filter;
- booking summary metrics;
- tải `.ics`;
- copy booking code;
- print e-ticket.

Calendar endpoint:

```text
GET /api/bookings/{id}/calendar.ics
```

Endpoint kiểm tra booking ownership và chỉ xuất calendar cho booking hợp lệ.

---

## V32 - Sold-out Waitlist & Seat Alerts

Khi showtime hết ghế, khách có thể đăng ký **Báo khi có ghế**.

Backend định kỳ kiểm tra availability và tạo notification khi ghế được mở lại bởi:

- booking timeout;
- cancellation;
- refund;
- seat-hold expiry.

Database dùng atomic claim để tránh gửi trùng alert khi cả `backend-1` và `backend-2` cùng chạy scheduler.

Migration:

```text
V32__showtime_waitlist.sql
```

---

## V33 - Showtime Planner & Conflict Guard

Trang:

```text
/admin/showtimes
```

V33 hỗ trợ:

- lập nhiều suất theo khoảng ngày;
- nhiều giờ chiếu trong một ngày;
- preview trước khi ghi database;
- phát hiện trùng phòng;
- tính `movie runtime + 15 phút turnaround`;
- bỏ qua slot bị conflict khi bulk-create;
- tối đa 62 ngày/lần;
- tối đa 12 start times/ngày;
- tối đa 500 slot/lần;
- pessimistic lock khi commit;
- không cho đổi movie/auditorium/start time của showtime đã có booking;
- vẫn cho đổi price/status của showtime đã bán vé;
- từ V34, planner còn phát hiện cả khoảng bảo trì/khóa phòng.

Timezone mặc định:

```text
Asia/Ho_Chi_Minh
```

Có thể cấu hình:

```properties
app.showtime.turnaround-minutes=15
app.showtime.zone=Asia/Ho_Chi_Minh
```

---

## V34 - Bảo trì & khóa phòng chiếu

V34 bổ sung chức năng vận hành rạp tại:

```text
/admin/maintenance
```

### Chức năng

- Tạo khoảng khóa một phòng chiếu để:
  - bảo trì máy chiếu;
  - vệ sinh sâu;
  - sửa âm thanh/điện;
  - tổ chức sự kiện riêng;
  - xử lý sự cố kỹ thuật.
- Chọn phòng, thời gian bắt đầu/kết thúc và lý do.
- Mỗi khoảng khóa tối đa 14 ngày.
- Không cho tạo khoảng khóa chồng lên blackout khác.
- Không cho khóa phòng nếu đang có suất chiếu `OPEN`/`CLOSED` trùng thời gian.
- Showtime `CANCELLED` không chiếm phòng.
- Có thể mở lại phòng bằng cách xóa blackout.
- Showtime Planner V33 tự xem blackout như một conflict.
- Cả bulk planner và thao tác tạo/sửa một showtime đều bị chặn nếu đụng khoảng bảo trì.
- Database lock trên auditorium giúp thao tác an toàn khi nhiều admin cùng cập nhật.

Migration:

```text
backend/src/main/resources/db/migration/V34__auditorium_blackout_windows.sql
```

Bảng mới:

```text
auditorium_blackout
```

REST API:

```text
GET    /api/admin/auditorium-blackouts
POST   /api/admin/auditorium-blackouts
DELETE /api/admin/auditorium-blackouts/{id}
```

---

## V34.1 - RC selector hardening

V34.1 is a test-only reliability patch for the V34 Release Candidate. The maintenance Playwright journey now selects the maintenance-room field with an exact accessible-label match so it cannot collide with the separate maintenance-room filter. No application behavior, database schema, Flyway migration, or production configuration changes are introduced by this patch.


---

## V35 - Automated Release Lifecycle

V35 chuẩn hóa quy trình phát hành từ `main` thành một chuỗi có kiểm soát và có thể audit:

```text
feature development
        ↓
main CI
        ↓
v35.0.0-rc.1
        ↓
Release Candidate E2E
        ↓
v35.0.0
        ↓
GitHub Release
```

Workflow mới:

```text
.github/workflows/release.yml
```

### Nguyên tắc an toàn

- workflow release chỉ chạy bằng `workflow_dispatch`;
- bắt buộc dispatch từ branch `main`;
- bắt buộc có `CineBooking CI` **SUCCESS cho đúng commit SHA**;
- stable version dùng `MAJOR.MINOR.PATCH`;
- release candidate dùng `vMAJOR.MINOR.PATCH-rc.N`;
- RC tag được tạo trước khi chạy E2E;
- RC E2E chạy full Docker smoke + Playwright Chromium;
- stable tag chỉ được tạo nếu RC E2E PASS;
- GitHub Release chỉ publish sau stable tag;
- tag đã tồn tại không bao giờ bị force/move;
- workflow không push container package và không deploy production.

### Quyền GitHub Token theo job

- `preflight`: `contents: read`, `actions: read`;
- `rc_tag`: `contents: write`;
- `rc_e2e`: `contents: read`;
- `publish`: `contents: write`.

### Cách phát hành V35

Sau khi feature được merge vào `main` và **CineBooking CI** xanh:

```text
GitHub → Actions → CineBooking Stable Release → Run workflow
branch: main
version: 35.0.0
rc_number: 1
```

Workflow tự chạy:

```text
CI SHA verification
→ create v35.0.0-rc.1
→ full-stack smoke
→ Playwright Chromium E2E
→ create v35.0.0
→ publish GitHub Release
```

Nếu RC thất bại do lỗi source và cần commit sửa mới, không di chuyển `rc.1`. Sau khi fix + main CI xanh, chạy lại với `rc_number: 2` để tạo `v35.0.0-rc.2`.

Nếu stable tag `v35.0.0` đã tồn tại, workflow fail an toàn thay vì ghi đè.

### Standalone RC

`.github/workflows/release-candidate.yml` vẫn được giữ để test thủ công không publish, default `v35.0.0-rc.1`, quyền `contents: read`.

### V35 verifier

```powershell
python .\tools\verify_v35_release_lifecycle.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v35.ps1
```

V35 là release-engineering upgrade; không thêm migration database và không thay đổi nghiệp vụ booking.


### V35 tooling hotfix - setup-node v7 compatibility

GitHub Actions hiện dùng `actions/setup-node@v7` trong main CI, standalone Release Candidate và stable-release workflow. V7 giữ nguyên input/output chính của action nhưng cập nhật runtime nội bộ.

Verifier V28 được giữ backward-compatible: **setup-node v6 hoặc v7** đều được xem là hợp lệ, vì mục tiêu của regression gate là ngăn workflow tụt xuống action major cũ chứ không khóa repo vào đúng một major duy nhất. Baseline hiện tại của CineBooking là:

```text
actions/checkout@v7
actions/setup-java@v5
actions/setup-node@v7
actions/upload-artifact@v7
```

Release target vẫn là `v35.0.0-rc.1 -> v35.0.0`; đây chỉ là toolchain compatibility hotfix và không thêm migration database hay thay đổi nghiệp vụ.

Kiểm tra riêng:

```powershell
python .\tools\verify_v28_ci.py
python .\tools\verify_v35_setup_node_compat.py
```


---

## V36 - Secure Ticket Transfer

V36 bổ sung chức năng **chuyển/tặng vé điện tử an toàn** giữa hai tài khoản khách hàng CineBooking.

### Luồng người dùng

1. chủ vé mở `/ticket/{bookingId}`;
2. chọn **🎁 Chuyển/tặng vé**;
3. nhập email tài khoản CineBooking của người nhận;
4. xác nhận chuyển quyền sở hữu;
5. booking biến mất khỏi Ví vé người gửi và xuất hiện trong Ví vé người nhận;
6. người nhận mở QR mới;
7. QR cũ/bản offline của người gửi bị từ chối tại cổng check-in.

### Quy tắc an toàn

- chỉ booking `CONFIRMED` mới được chuyển;
- vé đã check-in không được chuyển;
- vé đang/đã hoàn tiền không được chuyển;
- người nhận phải là tài khoản `USER` đang hoạt động;
- không được chuyển cho chính mình;
- mặc định chỉ chuyển trước giờ chiếu ít nhất **60 phút**;
- mặc định mỗi vé được chuyển tối đa **1 lần**;
- row-level `PESSIMISTIC_WRITE` lock bảo vệ thao tác khi nhiều request cùng tới hai backend replica;
- audit log ghi lại hành động `TICKET_TRANSFER`;
- notification được gửi cho cả người gửi và người nhận.

Cấu hình:

```env
TICKET_TRANSFER_CUTOFF_MINUTES=60
TICKET_MAX_TRANSFERS=1
```

Migration:

```text
backend/src/main/resources/db/migration/V36__secure_ticket_transfer.sql
```

V36 lưu thêm:

```text
purchaser_user_id
ticket_version
transfer_count
transferred_at
transferred_from_user_id
```

`purchaser_user_id` giữ nguyên người mua ban đầu để loyalty/refund vẫn hoàn lợi ích cho đúng tài khoản, kể cả khi vé đã được tặng cho người khác.

### QR rotation

V36 phát QR mới dạng `CINEBOOKING|V2|...` có `ticket_version`. Mỗi lần chuyển vé, `ticket_version` tăng lên; check-in so sánh version trong QR với version hiện tại của booking. Vì vậy ảnh QR cũ và vé offline cũ không còn hiệu lực.

QR `V1` cũ vẫn được đọc cho các booking chưa chuyển (`ticket_version = 1`) để không làm hỏng ảnh vé đã lưu trước khi nâng cấp V36.

REST API:

```text
GET  /api/bookings/{id}/transfer-eligibility
POST /api/bookings/{id}/transfer
```

Playwright RC có journey riêng kiểm tra:

```text
đăng ký người nhận
→ người gửi mua vé
→ lấy QR cũ
→ chuyển vé qua UI
→ người nhận thấy booking + QR mới
→ staff gate từ chối QR cũ
→ staff gate chấp nhận/check-in QR mới
```

Release target:

```text
main CI
→ v36.0.0-rc.1
→ Release Candidate E2E
→ v36.0.0
→ GitHub Release
```

---

### V36 verification & release

Source verifier:

```powershell
python .\tools\verify_v36_ticket_transfer.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v36.ps1
```

Sau khi CI `main` xanh, phát hành bằng workflow chuẩn V35+:

```text
GitHub → Actions → CineBooking Stable Release → Run workflow
branch: main
version: 36.0.0
rc_number: 1
```

Workflow tự tạo `v36.0.0-rc.1`, chạy full-stack smoke + toàn bộ Playwright E2E, rồi chỉ khi PASS mới tạo `v36.0.0` và GitHub Release. Nếu RC fail sau khi cần commit fix mới, tăng `rc_number` thành `2`; không di chuyển tag RC cũ.

---

## V37 - Payment Gateway Production Ready

V37 hardens CineBooking's payment subsystem around VNPay and MoMo while keeping the MOCK gateway available for local/CI E2E. The browser redirect is **display-only**: it verifies the gateway signature and then polls CineBooking for the server-side state. Booking/payment mutation only comes from authenticated CineBooking actions, signed server-to-server IPN, or an explicit Admin reconciliation.

### What V37 adds

- payment-start `Idempotency-Key` protection across both backend replicas;
- payer ownership stored separately from ticket ownership, so V36 ticket transfer does not transfer the original payment/refund history;
- merchant order ID separated from the provider transaction ID;
- signed VNPay return/IPN verification with amount checks;
- signed MoMo redirect/IPN verification with amount checks;
- exactly-once webhook event claiming through PostgreSQL `ON CONFLICT DO NOTHING`;
- rejected/invalid webhook payloads are isolated by payload hash so they cannot consume the canonical idempotency key of a later valid IPN;
- `PENDING`, `SUCCESS`, `FAILED`, `EXPIRED`, `REVIEW`, `REFUNDED` payment lifecycle;
- automatic payment-window expiry and booking/seat release;
- late gateway success protection: a success arriving after the booking is no longer valid goes to `REVIEW` instead of silently recreating a ticket;
- VNPay QueryDr and MoMo transaction query support for Admin reconciliation;
- `/payments` customer payment history;
- `/admin/payments` payment/IPN operations dashboard;
- gateway availability exposed to the booking UI so unconfigured real gateways are disabled instead of failing after seat selection;
- Flyway `V37__payment_gateway_hardening.sql` and Testcontainers coverage for the new schema and idempotent payment claim.

### Sandbox/default endpoint configuration

The repository contains **URLs only**, never merchant secrets:

```env
PAYMENT_MOCK_ENABLED=true
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_QUERY_URL=https://sandbox.vnpayment.vn/merchant_webapi/api/transaction
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
VNPAY_RETURN_URL=http://localhost/payment/result
VNPAY_IPN_URL=http://localhost/api/payments/vnpay/ipn
MOMO_CREATE_URL=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_QUERY_URL=https://test-payment.momo.vn/v2/gateway/api/query
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=
MOMO_REDIRECT_URL=http://localhost/payment/result
MOMO_IPN_URL=http://localhost/api/payments/momo/ipn
```

For a real sandbox/production merchant, put credentials in local `.env` or deployment secrets. Do not commit them. Public IPN URLs must be reachable by the gateway over HTTPS in real integration environments.

### V37 verification

```powershell
python .\tools\verify_v37_payment_gateway.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v37.ps1
```

Start the stack without deleting persistent data:

```powershell
docker compose up -d --build
docker compose ps
```

Do **not** use `docker compose down -v` for normal updates.

After `main` CI is green, publish through the stable-release lifecycle:

```text
GitHub -> Actions -> CineBooking Stable Release -> Run workflow
branch: main
version: 37.0.0
rc_number: 1
```

The lifecycle is:

```text
main CI
-> v37.0.0-rc.1
-> full-stack smoke + Playwright E2E
-> v37.0.0
-> GitHub Release
```

If a source fix is needed after RC creation, push the fix, wait for `main` CI, then use `rc_number: 2`. Never move an existing RC or stable tag.

### V37 RC2 - Playwright payment history selector hardening

The V37 payment-history journey now scopes the `SUCCESS` and `MOCK` assertions to the visible payment transaction card. This prevents Playwright from matching the hidden `<option>SUCCESS</option>` in the status filter while preserving the same runtime behavior and payment implementation. No backend, database, migration, payment API, or production gateway behavior changes are included in this RC-only test hardening.


---

## V38 - Refund & Cancellation Automation

V38 upgrades the existing refund flow into an explicit policy-driven cancellation lifecycle. It does **not** pretend that a real VNPay/MoMo refund has happened: MOCK payments may auto-refund inside CineBooking, while real gateway payments require an external/provider refund reference before an Admin can mark the booking refunded.

### Default refund policy

- **24 hours or more before showtime:** `AUTO_FULL`, 100% refund, 0% cancellation fee.
- **6 to under 24 hours:** `AUTO_PARTIAL`, 80% refund, 20% cancellation fee.
- **2 to under 6 hours:** `MANUAL_PARTIAL`, 50% refund, Admin confirmation required.
- **Under 2 hours:** `NON_REFUNDABLE`.

The thresholds and partial rates are configurable through `.env`:

```env
REFUND_FULL_REFUND_MINUTES=1440
REFUND_PARTIAL_AUTO_MINUTES=360
REFUND_MINIMUM_MINUTES=120
REFUND_PARTIAL_AUTO_RATE=0.80
REFUND_MANUAL_RATE=0.50
```

### V38 behavior

- `/api/bookings/{id}/refund-quote` calculates the policy before the customer confirms cancellation;
- the booking stores the applied rate, cancellation fee, policy code, automatic/manual flag, processor and provider reference as an immutable processing snapshot;
- only MOCK payments are auto-finalized when the time policy allows it;
- VNPay/MoMo refunds stay in `REFUND_REQUESTED` until an Admin records the gateway/provider refund reference;
- refund completion reverses earned loyalty, restores redeemed loyalty to the original purchaser, releases voucher redemption, restores concession inventory, releases seats, broadcasts the seat update and immediately scans the V32 waitlist;
- payment history records `refunded_amount`, `refunded_at` and `refund_reference`, so a partial refund is visible even though the payment lifecycle status is `REFUNDED`;
- duplicate customer refund requests are idempotent for `REFUND_REQUESTED` and `REFUNDED` bookings;
- checked-in tickets and requests inside the minimum cutoff remain blocked.

Flyway migration: `V38__refund_cancellation_automation.sql`.

### V38 verification

```powershell
python .\tools\verify_v38_refund_automation.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v38.ps1
```

Start/update Docker without deleting persistent PostgreSQL data:

```powershell
docker compose up -d --build
docker compose ps
```

Do **not** use `docker compose down -v` for a normal update.

After `main` CI is green, publish using the stable release workflow:

```text
GitHub -> Actions -> CineBooking Stable Release -> Run workflow
branch: main
version: 38.0.0
rc_number: 1
```

Release lifecycle:

```text
main CI
-> v38.0.0-rc.1
-> full-stack smoke + Playwright E2E
-> v38.0.0
-> GitHub Release
```

If an RC needs a source fix, commit/push the fix, wait for `main` CI to become green again, then increment `rc_number` (`2`, `3`, ...). Never move an existing RC or stable tag.


### V38 RC compile compatibility hotfix

The V38 refund approval contract now forwards `providerReference` consistently through both admin refund entry points. The legacy `/api/admin/booking-ops/{id}/refund-approve` path accepts the same gateway refund reference requirement as `/api/admin/refunds/{id}/approve`, preventing a Java compile-time signature mismatch while preserving MOCK approval without a provider reference.

### V38 RC3 refund policy selector hardening

The V38 refund Playwright journey now scopes the `100%` assertion to the percentage/amount row with an anchored locator (`/^100%\s*·/`). This prevents strict-mode collisions with the explanatory sentence that also contains `100%`. This is RC-only test hardening; refund policy, backend behavior, database schema and payment/refund semantics are unchanged.


---

## V39 - Seat Map & Booking UX 2.0

V39 upgrades the existing seat-booking path instead of adding a separate module. The Redis hold remains the concurrency authority, while the customer seat map becomes easier to use under real contention.

### V39 behavior

- `GET /api/showtimes/{showtimeId}/seat-suggestions?count=N` ranks up to five contiguous available seat groups, preferring row-center positions while de-prioritizing accessible inventory when alternatives exist;
- the suggestion engine refuses candidates that would create a **new single-seat gap** between unavailable/selected seats;
- `POST /api/showtimes/{showtimeId}/selection-validation` lets the UI validate a selection before the actual Redis hold, while the hold endpoint repeats the same validation so direct API callers cannot bypass the rule;
- the hold endpoint caps one booking at `SEAT_MAX_PER_BOOKING` seats (default `8`);
- the seat map exposes a server-authoritative `holdRemainingSeconds`, derived from Redis TTL, and the browser re-syncs it every 15 seconds while a hold is active;
- Redis Lua acquisition remains atomic across `backend-1` and `backend-2`: when two customers request the same seats, only one hold succeeds;
- STOMP/Redis seat events continue to update every backend replica, and the booking page now surfaces a visible realtime-update indicator;
- the V39 Playwright journey registers two customers, asks for a two-seat recommendation, races the exact same seat pair, and requires one `200` winner plus one `409` loser.

No Flyway migration is required for V39.

### V39 seat-selection configuration

```env
SEAT_HOLD_TTL_SECONDS=300
SEAT_MAX_PER_BOOKING=8
SEAT_PREVENT_SINGLE_GAP=true
```

These values are non-secret configuration and are safe to document in `.env.example`. Real credentials remain excluded from source control.

### V39 verification

```powershell
python .\tools\verify_v39_seat_map_ux.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v39.ps1
```

Start/update the stack without deleting PostgreSQL data:

```powershell
docker compose up -d --build
docker compose ps
```

Do **not** use `docker compose down -v` for normal updates.

After `main` CI is green, publish through the stable release workflow:

```text
GitHub -> Actions -> CineBooking Stable Release -> Run workflow
branch: main
version: 39.0.0
rc_number: 1
```

Release lifecycle:

```text
main CI
-> v39.0.0-rc.1
-> full-stack smoke + Playwright E2E
-> v39.0.0
-> GitHub Release
```

If an RC needs a source fix, commit/push the fix, wait for `main` CI again, then increment `rc_number`. Never move an existing RC or stable tag.

### V39.1 - RC2 ticket-transfer determinism

The V39 RC1 browser run exposed a date-sensitive legacy V36 ticket-transfer test. Quick Booking contains the seeded demo calendar starting on 2026-08-18, while ticket transfer requires the showtime to remain at least 60 minutes in the future. The transfer E2E now selects the farthest Quick Booking date before creating the booking, so the transfer eligibility button is deterministic during the V39 release window. No backend, database, QR, payment, refund, or seat-map behavior changes are included in this RC hardening patch. After a failed `v39.0.0-rc.1`, publish the next immutable candidate as `v39.0.0-rc.2`; do not move the RC1 tag.

### V39.2 - RC3 ticket-transfer/check-in window determinism

The V39 RC2 browser run proved the transferred V2 QR is accepted by the check-in preview, but the E2E had moved the booking to the farthest seeded date. That solved the 60-minute transfer cutoff while pushing the same ticket outside the default 48-hour early check-in window, so the preview returned `allowed=false` and no final check-in request was sent. The journey now selects tomorrow in the `Asia/Ho_Chi_Minh` cinema timezone: far enough for secure transfer and close enough for staff-gate validation/check-in. No backend, database, QR rotation, seat-map, payment, or refund behavior changes are included. After the failed `v39.0.0-rc.2`, publish the next immutable candidate as `v39.0.0-rc.3`; do not move RC1 or RC2 tags.



---

## V40 - Loyalty & Membership 2.0

V40 upgrades the existing loyalty system from a simple spendable balance into a lifetime membership ledger. Spending reward points no longer demotes a customer tier; tier qualification is based on lifetime qualifying points earned from successful paid bookings.

### Membership tiers and earning

- `BRONZE`: 0-499 lifetime qualifying points, `1.00x` earning;
- `SILVER`: 500-1499, `1.10x`;
- `GOLD`: 1500-3999, `1.25x`;
- `DIAMOND`: 4000+, `1.50x`.

Payment earning, booking redemption and refund reversal all route through `LoyaltyService`. V36 `purchaser_user_id` remains the economic owner for loyalty reversal/refund after a ticket transfer.

### Expiring point lots

V40 stores every credit as a `loyalty_point_lot` and consumes the earliest-expiring balance first. New lots expire after a configurable number of calendar months. Expiry is recorded as an `EXPIRE` ledger transaction and can be processed by the scheduled sweep or manually by Admin.

```env
LOYALTY_POINT_EXPIRY_MONTHS=12
LOYALTY_EXPIRING_SOON_DAYS=30
LOYALTY_EXPIRY_SCAN_MS=3600000
```

The profile shows available points, lifetime points, tier progress, earning multiplier, points expiring soon and the next expiry time.

### Reward catalog and private wallet

Seeded rewards include:

- `RWD20K`: 200 points -> private 20,000 VND voucher;
- `RWD10`: 350 points -> private 10% voucher, capped at 50,000 VND;
- `RWDCORN`: 300 points -> one Caramel Popcorn concession reward.

Reward vouchers are bound to `voucher.owner_user_id`, do not appear in the public/global voucher catalog and cannot be quoted or applied by another member. Concession rewards generate a one-time `GIFT-*` code; Staff/Manager/Admin claims it at the counter and tracked inventory is decremented exactly once with movement type `LOYALTY_REWARD`.

### Birthday benefit

A customer may self-enter a birth date once. Admin can correct it later with a required audit reason. On the member's birthday in `Asia/Ho_Chi_Minh`, the customer can claim one private 20% voucher per year, capped at 50,000 VND and valid for 30 days.

### Admin and staff operations

Admin `/admin/loyalty` provides member balance/lifetime/tier/expiry visibility, signed point adjustments with a required reason, audited birth-date correction and an on-demand expiry sweep. Admin adjustments intentionally do **not** manufacture lifetime qualifying points. Staff counter `/staff/check-in` includes the `GIFT-*` concession reward claim flow.

### V40 API

```text
GET  /api/loyalty/summary
GET  /api/loyalty/transactions
GET  /api/loyalty/rewards
GET  /api/loyalty/redemptions
GET  /api/loyalty/vouchers
POST /api/loyalty/rewards/{id}/redeem
POST /api/loyalty/birthday-reward

GET  /api/admin/loyalty/members
POST /api/admin/loyalty/users/{userId}/adjustments
PUT  /api/admin/loyalty/users/{userId}/birth-date
POST /api/admin/loyalty/expire-now

POST /api/staff/loyalty-rewards/claim
```

Flyway migration: `V40__loyalty_membership_2.sql`.

### V40 verification

```powershell
python .\tools\verify_v40_loyalty_membership.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v40.ps1
```

Start/update Docker without deleting persistent data:

```powershell
docker compose up -d --build
docker compose ps
```

Do **not** use `docker compose down -v` for normal updates.

After `main` CI is green, publish V40 through the stable release workflow:

```text
GitHub -> Actions -> CineBooking Stable Release -> Run workflow
branch: main
version: 40.0.0
rc_number: 1
```

Release lifecycle:

```text
main CI
-> v40.0.0-rc.1
-> full-stack smoke + Playwright E2E
-> v40.0.0
-> GitHub Release
```

If an RC needs a source fix, commit/push the fix, wait for `main` CI to become green again and increment `rc_number`. Never move an existing RC or stable tag.


### V40.1 - RC2 loyalty profile E2E state anchors

The V40 RC1 full-stack run brought up nginx, PostgreSQL, Redis, both backend replicas and the frontend successfully, and seven of eight Chromium journeys passed. The only failure was the new loyalty journey waiting for an exact `500 điểm` text node on `/profile`. The profile intentionally renders the numeric balance and its `điểm khả dụng` label as separate elements, and the tier is rendered as `Hạng BRONZE`, so those exact combined-text locators were not valid assertions of the actual UI.

RC2 hardens the test without weakening the business checks:

- after the Admin credits 500 non-qualifying points, the customer session first re-reads `/api/loyalty/summary` and must observe balance `500`, lifetime `0`, tier `BRONZE`;
- the profile exposes stable `data-testid` anchors for balance, lifetime points and membership tier;
- Playwright verifies visible balance transitions `500 -> 300 -> 0` while the tier remains `BRONZE`;
- the PostgreSQL integration test re-reads the customer summary after the Admin credit and after reward redemption, so persistence/ledger regressions are separated from browser locator regressions.

No loyalty economics, tier thresholds, database migration, reward prices, payment/refund behavior or production API contract changes are included in this RC hardening patch. Because `v40.0.0-rc.1` is immutable and already failed, publish the next candidate with `version: 40.0.0` and `rc_number: 2`; do not move or delete the RC1 tag.

### V40.2 - RC3 admin-to-staff auth hand-off determinism

The V40 RC2 full-stack run again brought up nginx, PostgreSQL, Redis, both backend replicas and the frontend successfully, and seven of eight Chromium journeys passed. The RC2 loyalty balance/profile fix worked; the remaining failure happened later in the same V40 journey when the test logged back in as Admin and immediately navigated to `/staff/check-in`. The login helper returned immediately after clicking `Đăng nhập`, while the application still had to persist `cinebooking_auth_v3` and complete its hard navigation. The following `page.goto("/staff/check-in")` could therefore race the login hand-off, and the client-side staff guard redirected the browser to `/login?reason=required&returnTo=%2Fstaff%2Fcheck-in` before the reward input was rendered.

RC3 hardens the authentication boundary rather than weakening the staff reward assertion:

- the Playwright login helper now accepts the expected role and waits for the post-login landing URL;
- it then polls `cinebooking_auth_v3` until a non-empty access token with the expected `USER` or `ADMIN` role is persisted;
- before opening the staff reward counter, the test calls authenticated `GET /api/me` and requires backend-confirmed role `ADMIN`;
- after navigating to `/staff/check-in`, the test asserts it remains on that route before locating the `GIFT-RWDCORN-XXXXXXXX` input;
- the one-time concession claim and duplicate `409` checks remain unchanged.

No loyalty economics, database migration, reward inventory behavior, authorization policy, production API contract, payment/refund logic or staff-page implementation changes are included in this RC hardening patch. Because `v40.0.0-rc.1` and `v40.0.0-rc.2` are immutable failed candidates, publish the next candidate with `version: 40.0.0` and `rc_number: 3`; do not move or delete the earlier RC tags.
### V40.3 - RC4 staff reward claim result contract

The `v40.0.0-rc.3` full-stack run proved the RC3 Admin auth hand-off fix: the loyalty journey reached `/staff/check-in`, submitted the GIFT code and rendered `Bắp Caramel × 1`. The remaining failure was a browser assertion that searched for the customer email as a standalone exact text node. The actual Staff UI renders `Khách: <email>` in one labelled row, so `getByText(email, { exact: true })` did not match even though the reward claim response had already been accepted and rendered.

RC4 hardens the claim-result boundary instead of weakening coverage. The Staff reward success card now exposes stable `data-testid` anchors for the result container, product/quantity, customer email and redemption code. The Playwright journey asserts all four values, including the exact generated customer email and exact GIFT redemption code, then still calls the claim API a second time and requires HTTP `409`. This separates a true claim-response/data regression from harmless label/DOM text composition changes. No backend loyalty economics, database migration, authorization, inventory mutation or redemption idempotency behavior changes are included.

Because `v40.0.0-rc.3` is immutable, publish the next candidate as `v40.0.0-rc.4`; do not move RC1, RC2 or RC3 tags.

## V41 - Notification Center & Engagement Automation 2.0

V41 upgrades the existing V22 notification center without replacing its email/browser delivery model. The new inbox keeps active and archived notifications separate, persists `read_at` and `archived_at`, assigns `LOW` / `NORMAL` / `HIGH` priority, and keeps unread badge counts limited to active notifications. Existing deep links remain valid.

Flyway migration `V41__notification_engagement_2.sql` adds notification priority/archive/read timestamps plus independent `loyalty_enabled` and `waitlist_enabled` preferences. Existing preference rows are backfilled safely by database defaults; no old migration is edited.

Notification categories now distinguish `WAITLIST` and `LOYALTY` from generic booking/general traffic. Waitlist availability and final 30-minute showtime reminders are high priority. Promotion traffic is low priority. Old clients that do not send the new loyalty/waitlist preference fields remain compatible because the backend preserves the existing values when those fields are omitted.

The customer API adds archive state while retaining the existing endpoints:

```text
GET  /api/notifications?view=ACTIVE
GET  /api/notifications?view=ARCHIVED
GET  /api/notifications/summary
POST /api/notifications/{id}/read
POST /api/notifications/{id}/archive
POST /api/notifications/{id}/unarchive
POST /api/notifications/read-all
GET  /api/notifications/preferences
PUT  /api/notifications/preferences
```

Showtime engagement reminders are now deduplicated at the database boundary so both backend replicas may scan safely. A confirmed, unchecked ticket can receive a 3-hour reminder and a separate final 30-minute reminder; each reminder has its own immutable dedupe key. The legacy `reminder_sent` column is retained for compatibility but is no longer the cross-replica dedupe mechanism.

The hourly loyalty job now also creates engagement alerts for points entering the configured expiry window and for an unclaimed birthday reward on the member's birthday in `Asia/Ho_Chi_Minh`. These use `createOnce(...)`, so repeated scheduler scans or two application replicas do not create duplicate inbox rows.

V41 configuration defaults:

```env
SHOWTIME_REMINDER_HOURS=3
SHOWTIME_FINAL_REMINDER_MINUTES=30
SHOWTIME_REMINDER_SCAN_MS=60000
LOYALTY_EXPIRING_SOON_DAYS=30
LOYALTY_EXPIRY_SCAN_MS=3600000
```

The `/notifications` UI now provides `Hộp thư` and `Đã lưu trữ` views, archive/restore actions, high-priority badges, filters for Waitlist and Loyalty, and independent preference toggles for those categories. `frontend/e2e/notification-engagement.spec.ts` creates a real notification through the authenticated API, verifies unread summary state, archives it, restores it, marks it read and re-reads the active API state.

### V41 verification

```powershell
python .\tools\verify_v41_notification_engagement.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v41.ps1
```

Normal update remains non-destructive:

```powershell
docker compose up -d --build
docker compose ps
```

Do **not** use `docker compose down -v` for a normal update.

After the V40 stable line is complete and V41 `main` CI is green, release V41 with:

```text
GitHub -> Actions -> CineBooking Stable Release -> Run workflow
branch: main
version: 41.0.0
rc_number: 1
```

Release lifecycle:

```text
main CI
-> v41.0.0-rc.1
-> full-stack smoke + 9 Playwright Chromium journeys
-> v41.0.0
-> GitHub Release
```

If an RC requires a source fix, commit the fix and increment `rc_number`. Never delete, move or force an existing RC/stable tag.

## V42 - Financial Ledger & Reconciliation

V42 adds an append-only double-entry financial ledger on top of the V37 payment gateway, V38 refund automation and V40 loyalty system. Payment/refund state remains in the existing domain tables; the new ledger is independent evidence used for financial operations and reconciliation instead of becoming a second mutable source of truth.
The account codes are operational control accounts for CineBooking reconciliation, not a statutory/general-ledger chart of accounts; revenue recognition remains outside this demo system.

Flyway migration `V42__financial_ledger_reconciliation.sql` creates `financial_ledger_entry`, `financial_ledger_line`, `financial_reconciliation_run` and `financial_reconciliation_issue`. Ledger entries use unique event keys (`PAYMENT_CAPTURE:<paymentId>` and `REFUND:<paymentId>`), so retries and duplicate callbacks cannot create duplicate accounting events. `financial_ledger_line` is double-entry: every positive VND event has equal DEBIT and CREDIT totals. PostgreSQL has an initially-deferred balance constraint trigger and explicit triggers that reject UPDATE/DELETE on both ledger tables, making the ledger append-only at the database boundary.

V42 posts these operational accounting pairs:

```text
PAYMENT_CAPTURED
  DEBIT  PAYMENT_CLEARING:<provider>
  CREDIT CUSTOMER_FUNDS_CAPTURED

REFUND_SETTLED
  DEBIT  CUSTOMER_FUNDS_REFUNDED
  CREDIT PAYMENT_CLEARING:<provider>
```

`SUCCESS`, paid `REVIEW`, and `REFUNDED` historical payments are backfilled by the V42 migration. Runtime capture recording is wired into `PaymentService`, including late gateway success that enters `REVIEW`; refund settlement recording is wired into `RefundService`. Event creation uses `INSERT ... ON CONFLICT (event_key) DO NOTHING`, and Java also validates debit equals credit before line persistence.

The Admin Financial Operations API is:

```text
GET  /api/admin/finance?date=YYYY-MM-DD
POST /api/admin/finance/reconcile?date=YYYY-MM-DD
POST /api/admin/finance/issues/{id}/resolve
```

Reconciliation uses the CineBooking business day in `Asia/Ho_Chi_Minh`. For every paid `SUCCESS`, `REFUNDED`, or paid `REVIEW` payment it checks that the immutable capture event exists and matches the payment amount. For refunds it checks the refund event and amount. It also compares total captured/refunded amounts with the daily ledger and compares each customer `loyalty_points` balance with the remaining V40 `loyalty_point_lot` balance. Mismatches become durable `financial_reconciliation_issue` rows with `WARNING` or `CRITICAL` severity; resolving an issue records the actor and an audit event instead of deleting history.

Automatic daily close runs at 01:10 in `Asia/Ho_Chi_Minh` for the previous business date. Both backend replicas may execute the scheduler, but the deterministic `AUTO:<businessDate>` run key is claimed with `ON CONFLICT DO NOTHING`, so only one reconciliation run is created. Safe defaults:

```env
FINANCE_AUTO_RECONCILE_ENABLED=true
FINANCE_DAILY_CLOSE_CRON=0 10 1 * * *
```

The `/admin/finance` screen shows daily captured, refunded and net amounts, the latest reconciliation status, immutable ledger lines, open issues and recent reconciliation runs. `frontend/e2e/financial-ledger.spec.ts` creates its own customer/booking, completes a MOCK payment, verifies the concrete `PAYMENT_CAPTURE:<paymentId>` event with `DEBIT PAYMENT_CLEARING:MOCK` and `CREDIT CUSTOMER_FUNDS_CAPTURED`, then runs reconciliation and requires a `CLEAN` result.

### V42 verification

```powershell
python .\tools\verify_v42_financial_ledger.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v42.ps1
```

Normal Docker update remains non-destructive:

```powershell
docker compose up -d --build
docker compose ps
```

Do not use `docker compose down -v` for normal updates because it removes persistent database volumes.

After V41 is stable and V42 `main` CI is green, run **CineBooking Stable Release** from `main` with:

```text
version: 42.0.0
rc_number: 1
```

The release path is:

```text
main CI
-> v42.0.0-rc.1
-> Docker smoke
-> 10 Playwright Chromium journeys
-> v42.0.0
-> GitHub Release
```

If an RC requires a source change, commit the fix and increment `rc_number`; never move an existing RC or stable tag.

## V42.1 - Analytics Export + CI/Release Wiring + Documentation Sync

V42.1 hoàn thiện chức năng export ngay trên trang `/admin/analytics`. Manager/Admin có thể giữ nguyên bộ lọc 7/30/90/365 ngày và rạp hiện tại rồi tải báo cáo bằng hai nút **Xuất CSV** và **Xuất Excel**.

API mới:

```text
GET /api/admin/analytics/export.csv?days=30&cinemaId=<optional-uuid>
GET /api/admin/analytics/export.xlsx?days=30&cinemaId=<optional-uuid>
```

- CSV dùng UTF-8 BOM để mở tiếng Việt ổn định trong Excel và chứa đầy đủ các section Analytics.
- XLSX là workbook nhiều sheet: Tổng quan, Doanh thu ngày, Hiệu suất rạp, Top phim, Top suất chiếu, Khung giờ, Heatmap ghế, Nhân viên, Booking, Payment, Bắp nước và Payment provider.
- Export dùng đúng dữ liệu từ `AdminAnalyticsService`, vì vậy số liệu tải xuống khớp với dashboard và bộ lọc hiện tại.
- Không có migration mới; Flyway latest vẫn là V42.

Các file chính thay đổi:

```text
backend/src/main/java/com/cinebooking/analytics/AdminAnalyticsController.java
backend/src/main/java/com/cinebooking/analytics/AnalyticsExportService.java
backend/src/test/java/com/cinebooking/analytics/AnalyticsExportServiceTest.java
frontend/app/admin/analytics/page.tsx
.github/workflows/ci.yml
.github/workflows/release-candidate.yml
.github/workflows/release.yml
tools/verify_v42_1_analytics_export.py
tools/diagnose-v42.1.ps1
Makefile
README.md
```

Kiểm tra source V42.1:

```powershell
python .\tools\verify_v42_financial_ledger.py
python .\tools\verify_v42_1_analytics_export.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v42.1.ps1
```

GitHub CI/Release của V42.1 đã được nối vào lifecycle hiện có:

```text
git push main
→ CineBooking CI
→ V26-V42.1 source regression
→ V42.1 verifier
→ Stable Release (manual)
→ v42.1.0-rc.N
→ V42.1 source gate + Docker smoke + Playwright E2E
→ v42.1.0
→ GitHub Release
```

Sau khi `main` CI xanh, vào **GitHub → Actions → CineBooking Stable Release → Run workflow** và dùng:

```text
branch: main
version: 42.1.0
rc_number: 1
```

Tag RC và stable là immutable. Nếu RC fail vì phải sửa source rồi commit SHA mới, tăng `rc_number`; không di chuyển tag cũ.

## V43 - Staff Operations 2.0

V43 nâng lớp vận hành nhân viên dựa trên nền V8/V10/V11/V23 thành một **trung tâm vận hành realtime** tại `/staff/operations`. Mục tiêu là để Staff/Manager/Admin nhìn được nhịp khách vào rạp, bàn giao việc giữa ca và ghi nhận/xử lý sự cố mà không phải tách sang công cụ ngoài.

Các cập nhật chính:

- **Live gate dashboard:** số lượt check-in 5 phút gần nhất, 1 giờ gần nhất, trong ngày, số nhân viên đang chấm công và số sự cố đang mở. Danh sách check-in mới nhất hiển thị phim, phòng, nhân viên và nguồn quét.
- **Realtime đa replica:** mỗi check-in/sự kiện vận hành publish qua Redis channel `cinebooking:staff-operations-events`; subscriber trên từng backend replica phát WebSocket theo topic `/topic/staff-operations/{cinemaId}`. Frontend vẫn polling 15 giây làm fallback.
- **Shift handover:** nhân viên đang trong ca có thể bàn giao cho Staff/Manager đang hoạt động cùng rạp; mỗi attendance chỉ có một bàn giao `PENDING`; người nhận phải đang chấm công đúng rạp mới xác nhận `ACCEPTED`.
- **Incident log:** Staff/Manager ghi sự cố theo nhóm `CUSTOMER/EQUIPMENT/SAFETY/SECURITY/PAYMENT/OTHER` và mức `LOW/MEDIUM/HIGH/CRITICAL`; chỉ Manager/Admin được đóng sự cố kèm ghi chú xử lý.
- **Chống check-in hai lần:** frontend debounce QR lặp trong 2,5 giây; backend vẫn dùng `PESSIMISTIC_WRITE` trên booking, `booking.checked_in_at` và unique index `uq_ticket_checkin_booking`, nên request đồng thời từ nhiều thiết bị/backend replica vẫn bị chặn ở server.
- **Mobile camera:** gate tiếp tục dùng camera sau qua `getUserMedia`, ưu tiên HD 1280×720; vẫn hỗ trợ ảnh chụp QR và QR URL.
- **Analytics Excel chi tiết theo từng bảng:** nút `/admin/analytics` đổi thành **Xuất Excel chi tiết**. Workbook vẫn dùng API `/api/admin/analytics/export.xlsx`, nhưng giờ mỗi section có một worksheet riêng và giữ đúng dữ liệu tương ứng với CSV: Tổng quan, Doanh thu theo ngày, Hiệu suất theo rạp, Top phim, Top suất chiếu, Nhu cầu theo giờ, Heatmap ghế, Hiệu suất nhân viên, Trạng thái booking, Trạng thái payment, Top bắp nước và Phương thức thanh toán. Mỗi worksheet lặp lại **Khoảng dữ liệu / Rạp / Ngày xuất**, đóng băng đến hàng tiêu đề và bật AutoFilter trên toàn vùng dữ liệu để có thể lọc/in/chia sẻ từng bảng độc lập.
- **Analytics CSV chi tiết theo từng bảng:** nút **Xuất CSV theo từng bảng** tải một gói `.zip` từ `/api/admin/analytics/export-csv.zip`. Gói gồm **12 file CSV UTF-8 BOM**, mỗi bảng Analytics là một file riêng (`01-tong-quan.csv` ... `12-phuong-thuc-thanh-toan.csv`). Từng file lặp lại **Khoảng dữ liệu / Rạp / Ngày xuất** và có hàng tiêu đề riêng, nên có thể mở độc lập bằng Excel mà không trộn nhiều bảng trong cùng một CSV. API `/api/admin/analytics/export.csv` cũ vẫn được giữ để tương thích ngược.

Analytics CSV/Excel chi tiết V43 không thêm migration. Excel giữ API cũ, CSV chi tiết bổ sung API mới:

```text
GET /api/admin/analytics/export-csv.zip?days=30&cinemaId=<optional-uuid>
GET /api/admin/analytics/export.xlsx?days=30&cinemaId=<optional-uuid>

# Legacy/backward-compatible combined CSV
GET /api/admin/analytics/export.csv?days=30&cinemaId=<optional-uuid>
```

Migration mới:

```text
backend/src/main/resources/db/migration/V43__staff_operations_2.sql
```

API V43:

```text
GET  /api/staff/operations/cinemas
GET  /api/staff/operations/live?cinemaId=<optional>
GET  /api/staff/operations/staff-options?cinemaId=<optional>
GET  /api/staff/operations/handovers?cinemaId=<optional>
POST /api/staff/operations/handovers
POST /api/staff/operations/handovers/{id}/accept
GET  /api/staff/operations/incidents?cinemaId=<optional>
POST /api/staff/operations/incidents
POST /api/staff/operations/incidents/{id}/resolve
```

Các file chính:

```text
backend/src/main/resources/db/migration/V43__staff_operations_2.sql
backend/src/main/java/com/cinebooking/domain/StaffShiftHandover.java
backend/src/main/java/com/cinebooking/domain/StaffIncident.java
backend/src/main/java/com/cinebooking/staffops/StaffOperationsService.java
backend/src/main/java/com/cinebooking/staffops/StaffOperationsController.java
backend/src/main/java/com/cinebooking/websocket/StaffOperationsEventPublisher.java
backend/src/main/java/com/cinebooking/websocket/RedisStaffOperationsEventSubscriber.java
frontend/app/staff/operations/page.tsx
frontend/app/staff/check-in/page.tsx
frontend/e2e/staff-operations.spec.ts
backend/src/main/java/com/cinebooking/analytics/AnalyticsExportService.java
backend/src/test/java/com/cinebooking/analytics/AnalyticsExportServiceTest.java
frontend/app/admin/analytics/page.tsx
tools/verify_v43_staff_operations.py
tools/verify_v43_analytics_excel_detail.py
tools/diagnose-v43.ps1
```

Release lifecycle V43:

```text
git push main
→ CineBooking CI
→ V26-V43 source regression
→ V43 source gate
→ Stable Release (manual)
→ v43.0.0-rc.N
→ Docker smoke + Playwright Chromium journeys
→ v43.0.0
→ GitHub Release
```

Sau khi `main` CI xanh, chạy **CineBooking Stable Release** với:

```text
branch: main
version: 43.0.0
rc_number: 1
```

---

## V44 - Cinema Maintenance & Asset Reliability 2.0

V44 phát triển tiếp từ V34 blackout và V43 Staff Operations thành một **trung tâm bảo trì & độ tin cậy thiết bị** tại `/admin/maintenance`. Manager/Admin không chỉ khóa phòng mà còn quản lý tài sản kỹ thuật, work order, hạn bảo trì và SLA quá hạn theo từng rạp.

Các cập nhật chính:

- **Equipment asset registry:** đăng ký máy chiếu, âm thanh, HVAC, màn chiếu, POS, network, power, safety và thiết bị khác bằng mã tài sản duy nhất; có rạp/phòng, vendor, serial, ngày lắp, lần bảo trì gần nhất và ngày bảo trì kế tiếp.
- **Asset health:** trạng thái `OPERATIONAL / DEGRADED / OUT_OF_SERVICE / MAINTENANCE`; dashboard đếm thiết bị suy giảm, ngừng hoạt động, đang bảo trì và thiết bị đến hạn service trong 14 ngày.
- **Maintenance work order:** ưu tiên `LOW / MEDIUM / HIGH / CRITICAL`, phân công Staff/Manager cùng rạp, hạn xử lý, liên kết thiết bị/phòng và có thể nối trực tiếp một sự cố `OPEN` từ V43.
- **Lifecycle có guard:** `OPEN -> IN_PROGRESS/BLOCKED/CANCELLED`, `IN_PROGRESS -> BLOCKED/RESOLVED/CANCELLED`, `BLOCKED -> IN_PROGRESS/CANCELLED`; `RESOLVED` và `CANCELLED` là terminal, không reopen bằng API. Các trạng thái `BLOCKED/RESOLVED/CANCELLED` bắt buộc ghi chú.
- **SLA dashboard:** đếm work order đang mở, critical đang mở và overdue theo `due_at`; Manager chỉ xem/quản lý rạp được phân công, Admin có thể đổi rạp.
- **Immutable maintenance history:** mọi create/plan/status change ghi `maintenance_work_order_event`; trigger PostgreSQL từ chối UPDATE/DELETE lịch sử này. Audit log hệ thống vẫn ghi các thao tác quản trị tương ứng.
- **V34 compatibility:** Admin vẫn có phần khóa/mở phòng chiếu ngay trong màn hình V44; guard chống blackout trùng suất đang hoạt động và conflict với Showtime Planner được giữ nguyên.
- **Navigation:** menu Manager/Admin có mục **Bảo trì & thiết bị**.

Migration V44:

```text
backend/src/main/resources/db/migration/V44__cinema_maintenance_asset_reliability.sql
```

Các bảng mới:

```text
cinema_equipment_asset
maintenance_work_order
maintenance_work_order_event
```

API V44:

```text
GET  /api/admin/maintenance/cinemas
GET  /api/admin/maintenance/auditoriums?cinemaId=<uuid>
GET  /api/admin/maintenance/staff-options?cinemaId=<uuid>
GET  /api/admin/maintenance/incident-options?cinemaId=<uuid>
GET  /api/admin/maintenance/summary?cinemaId=<uuid>
GET  /api/admin/maintenance/assets?cinemaId=<uuid>
POST /api/admin/maintenance/assets
PUT  /api/admin/maintenance/assets/{id}
GET  /api/admin/maintenance/work-orders?cinemaId=<uuid>
POST /api/admin/maintenance/work-orders
PUT  /api/admin/maintenance/work-orders/{id}/plan
POST /api/admin/maintenance/work-orders/{id}/transition
GET  /api/admin/maintenance/work-orders/{id}/events
```

V44 verification:

```powershell
python .\tools\verify_v43_staff_operations.py
python .\tools\verify_v43_analytics_excel_detail.py
python .\tools\verify_v43_analytics_csv_detail.py
python .\tools\verify_v44_maintenance_reliability.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v44.ps1
```

Release lifecycle V44:

```text
git push main
→ CineBooking CI
→ V26-V44 source regression
→ Backend unit + Testcontainers integration
→ V44 source gate
→ Stable Release (manual)
→ v44.0.0-rc.N
→ Docker smoke + Playwright Chromium journeys
→ v44.0.0
→ GitHub Release
```

Sau khi `main` CI xanh, chạy **CineBooking Stable Release** với:

```text
branch: main
version: 44.0.0
rc_number: 1
```

Nếu RC cần sửa source, commit/push fix rồi tăng `rc_number`; không di chuyển hoặc ghi đè tag RC/stable cũ.

---

## V45 - Customer Support & Service Recovery 2.0

V45 phát triển tiếp lớp vận hành của V43/V44 thành **trung tâm hỗ trợ khách hàng end-to-end**. Khách hàng có thể tạo case tại `/support`, gắn booking khi cần, theo dõi SLA và trao đổi trực tiếp. Manager/Admin xử lý tại `/admin/support` theo rạp, ưu tiên, người phụ trách và lịch sử append-only.

Các cập nhật chính:

- **Customer support case:** category `BOOKING / PAYMENT / REFUND / TICKET / CINEMA_EXPERIENCE / STAFF / OTHER`, case number riêng, subject/description, booking/rạp liên quan.
- **SLA theo priority:** `CRITICAL=4h`, `HIGH=24h`, `MEDIUM=48h`, `LOW=72h`; dashboard đếm active, waiting customer, critical và overdue SLA.
- **Conversation & triage:** khách gửi message; Manager/Admin phản hồi hoặc ghi internal note; case có assignee và priority có thể thay đổi.
- **Lifecycle guard:** `OPEN -> IN_PROGRESS/CLOSED`, `IN_PROGRESS -> WAITING_CUSTOMER/RESOLVED/CLOSED`, `WAITING_CUSTOMER -> IN_PROGRESS/RESOLVED/CLOSED`, `RESOLVED -> IN_PROGRESS/CLOSED`, `CLOSED` terminal.
- **Cinema scope:** case gắn booking tự suy ra rạp qua showtime/auditorium; Manager chỉ thấy và xử lý case của rạp mình; Admin có thể xem toàn hệ thống.
- **Immutable support history:** mọi create/message/reply/plan/status change ghi vào `customer_support_case_event`; PostgreSQL trigger chặn UPDATE/DELETE.
- **Notification:** phản hồi và thay đổi trạng thái từ staff tạo notification cho khách và link về `/support`.
- **Navigation:** Header có mục **Hỗ trợ** cho tài khoản đăng nhập; Manager/Admin có **Hỗ trợ khách hàng** trong menu quản lý.

Migration V45:

```text
backend/src/main/resources/db/migration/V45__customer_support_service_recovery.sql
```

Các bảng mới:

```text
customer_support_case
customer_support_case_event
```

API khách hàng:

```text
GET  /api/support/cases
POST /api/support/cases
GET  /api/support/cases/{id}/events
POST /api/support/cases/{id}/messages
```

API Manager/Admin:

```text
GET  /api/admin/support/cinemas
GET  /api/admin/support/staff-options?cinemaId=<uuid>
GET  /api/admin/support/summary?cinemaId=<uuid>
GET  /api/admin/support/cases?cinemaId=<optional-uuid>
GET  /api/admin/support/cases/{id}/events
PUT  /api/admin/support/cases/{id}/plan
POST /api/admin/support/cases/{id}/reply
POST /api/admin/support/cases/{id}/transition
```

V45 verification:

```powershell
python .\tools\verify_v44_maintenance_reliability.py
python .\tools\verify_v45_customer_support.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v45.ps1
```

Release lifecycle V45:

```text
git push main
→ CineBooking CI
→ V26-V45 source regression
→ Backend unit + Testcontainers integration
→ V45 source gate
→ Stable Release (manual)
→ v45.0.0-rc.N
→ Docker smoke + Playwright Chromium journeys
→ v45.0.0
→ GitHub Release
```

Sau khi `main` CI xanh, chạy **CineBooking Stable Release** với `version: 45.0.0` và `rc_number: 1`. Nếu RC fail do cần sửa source, push fix rồi tăng `rc_number`; không ghi đè tag RC cũ.

---

## V46 - Security & Account Protection 2.0

V46 nâng lớp bảo mật V21 thành **Security Center** cho người dùng và **Security Operations** cho Admin. Hệ thống theo dõi thiết bị tin cậy, tạo cảnh báo có risk score khi đăng nhập từ thiết bị mới hoặc khi brute-force chạm ngưỡng, đồng thời ghi nhận đổi/đặt lại mật khẩu để người dùng chủ động kiểm tra tài khoản.

Các cập nhật chính:

- **Trusted devices:** người dùng có thể đánh dấu phiên hiện tại là thiết bị tin cậy, đặt nhãn, theo dõi IP đầu/cuối và thu hồi trust bất kỳ lúc nào.
- **Risk-scored alerts:** `NEW_DEVICE`, `CREDENTIAL_ATTACK`, `PASSWORD_CHANGED`, `PASSWORD_RESET`, `SESSION_REVOKED`; severity `LOW / MEDIUM / HIGH / CRITICAL` và risk score 0-100.
- **Dual brute-force protection:** rate limit theo cả email và IP qua Redis; email mặc định khóa sau 5 lần sai, IP mặc định 20 lần trong cửa sổ khóa.
- **High-risk notification:** cảnh báo HIGH/CRITICAL tạo notification cho người dùng và link về `/security`.
- **Password hardening:** đổi mật khẩu tạo security alert và đăng xuất các thiết bị khác; reset mật khẩu tạo HIGH alert và thu hồi toàn bộ session cũ.
- **Customer Security Center:** `/security` có KPI session/trusted-device/alert, danh sách thiết bị tin cậy, cảnh báo và thao tác acknowledge.
- **Brave-aware browser identity patch:** frontend xác minh `navigator.brave.isBrave()` rồi gửi header hiển thị `X-CineBooking-Browser`; backend chỉ chấp nhận whitelist browser names, đồng bộ lại session/trusted-device/security-alert hiện tại và vẫn fallback User-Agent cho Chrome/Edge/Firefox/Safari/Opera/Vivaldi. Browser hint chỉ dùng cho metadata hiển thị/fingerprint phụ, không dùng làm bằng chứng xác thực hay phân quyền.
- **Admin Security Operations:** `/admin/security` hiển thị cảnh báo 24h, alert chưa xác nhận, high-risk và tổng trusted device đang active.
- **V46 realistic reference seed:** schema có 49 bảng trong pgAdmin; dữ liệu hiển thị dùng tên tự nhiên, payment tham chiếu chỉ dùng `MOCK`, `trusted_device` và `security_alert` có 10 dòng UTF-8 mỗi bảng, và quan hệ phim vẫn tái sử dụng 8 phim V29 hiện có.
- **RC E2E logout compatibility:** security journey chờ trạng thái đăng xuất rồi điều hướng rõ ràng về `/login`, phù hợp với UI hiện tại vốn đưa người dùng về trang chủ sau khi logout.

Migration V46:

```text
backend/src/main/resources/db/migration/V46__security_account_protection_2.sql
```

Các bảng mới:

```text
trusted_device
security_alert
```

API người dùng:

```text
PATCH  /api/me/security/client-context
GET    /api/me/security/overview
GET    /api/me/security/trusted-devices
POST   /api/me/security/trusted-devices/current
DELETE /api/me/security/trusted-devices/{id}
GET    /api/me/security/alerts
PATCH  /api/me/security/alerts/{id}/acknowledge
```

API Admin:

```text
GET /api/admin/security/overview
GET /api/admin/security/alerts
GET /api/admin/security/users/{userId}/sessions
DELETE /api/admin/security/users/{userId}/sessions
```

V46 verification:

```powershell
python .\tools\verify_v45_customer_support.py
python .\tools\verify_v46_security_account_protection.py   # includes Brave-over-Chrome UA checks
python .\tools\verify_reference_data_49.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v46.ps1
```

Release lifecycle V46:

```text
git push main
→ CineBooking CI
→ V26-V46 source regression
→ Backend unit + Testcontainers integration
→ V46 source gate
→ Stable Release (manual)
→ v46.0.0-rc.N
→ Docker smoke + Playwright Chromium journeys
→ v46.0.0
→ GitHub Release
```

Sau khi `main` CI xanh, chạy **CineBooking Stable Release** với `version: 46.0.0` và `rc_number: 1`. Nếu RC fail do cần sửa source, push fix rồi tăng `rc_number`; không ghi đè tag RC cũ.

---

### V46 reference data - UTF-8 realistic fixture

The V47 schema contains **50 pgAdmin tables**: 49 application tables plus `flyway_schema_history`. The reference seed keeps every application table populated while replacing placeholder `Demo`/`mẫu` values with realistic Vietnamese names, cinema branches, staff roles, concession products, maintenance assets, support cases, device labels and security events.

`movie` is deliberately not populated with synthetic rows. All seeded movie relations reuse the eight canonical V29 films already present in the database. `flyway_schema_history` is never inserted, updated or deleted; its genuine Flyway migration rows satisfy the table-data check. `financial_ledger_line` intentionally receives twenty rows so every payment capture remains balanced with one debit and one credit line.

Reference payment history uses **`MOCK` only** because the local environment does not have active VNPay/MoMo credentials. Existing deterministic seed rows previously marked `VNPAY` or `MOMO` are repaired in place to `MOCK`; the application gateway code remains available for future configuration, but the reference database no longer pretends those gateways were used.

The UTF-8-safe runner copies SQL byte-for-byte into the PostgreSQL container and executes `psql -f`, avoiding Windows PowerShell code-page conversion. Re-running it updates existing deterministic reference rows in place, including records created by earlier seed versions.

Run from the repository root on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\seed-reference-50-tables.ps1
```

The older V45 command remains a compatibility alias:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\seed-demo-45-tables.ps1
```

Static verification:

```powershell
python .\tools\verify_v47_payment_gateway_operations.py
python .\tools\verify_seed_demo_50.py
python .\tools\verify_reference_data_50.py
```

Inspect exact row counts for all 50 tables:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\check-reference-50-table-counts.ps1
```

The seed aborts if PostgreSQL is not UTF-8, if checked text still contains encoding corruption, if seeded human-readable values still contain placeholder `Demo`/`mẫu`, if deterministic payment rows still use VNPay/MoMo, if the eight canonical movies are unavailable, if synthetic movie rows remain, or if any of the 50 pgAdmin tables is empty. Reference accounts run from `an.nguyen@cinebooking.local` through `chau.ho@cinebooking.local`; the shared password is `CineBooking@123`.

### V46 reference-data branch visibility fix

The 49-table reference seed now distributes its ten deterministic auditoriums and maintenance assets across the ten reference cinemas instead of attaching every asset to one cinema. This matters because `/admin/maintenance` is intentionally cinema-scoped: selecting CineHub Gigamall only returns rows whose `cinema_id` is Gigamall. Re-running `tools/seed-reference-49-tables.ps1` repairs older deterministic rows in-place, so each reference cinema has a matching auditorium and maintenance asset; no database reset is required.

### V46 reference schedule visibility fix

The realistic V46 reference-data runner now keeps a separate deterministic set of 10 upcoming `SCHEDULED` staff shifts between today and the next nine days. Historical completed shifts remain intact for attendance and audit scenarios, while `/admin/shifts` is populated immediately under its default 14-day filter after running `tools/seed-reference-49-tables.ps1`. No Flyway migration is added by this reference-data repair.

### V46 RC3 security E2E logout synchronization fix

The V46 Brave security Playwright journey no longer assumes that the public header must render the `Đăng nhập` link immediately after a logout click. The application intentionally navigates to `/` after logout, while React auth-state rendering and navigation can complete in different orders under CI. The journey now synchronizes on the real `POST /api/auth/logout` response, requires HTTP 204, then explicitly opens `/login` before continuing. This keeps the test aligned with the production logout contract and removes the RC2 timing race without changing application behavior or schema.


### V46 RC4 security E2E exact-alert and navigation hardening

The RC3 full-stack run proved that registration, customer login, Brave detection, trusted-device registration and acknowledgement all progress far enough for the customer security view to render. The remaining release failure was in the hand-off to the Admin verification step: one attempt reached `Security Operations` but asserted a generic `NEW_DEVICE` row without tying it to the customer created by the test, while the retry still raced the Header's post-logout hard navigation against an explicit `page.goto('/login')`.

RC4 removes both sources of nondeterminism without weakening the security contract. The Playwright journey logs out through the real `/api/auth/logout` endpoint from `page.evaluate`, requires HTTP 204, clears the refresh cookie and local auth state, then navigates to `/login` only after no competing Header redirect remains. Login is synchronized on the real `/api/auth/login` response and the expected role stored in `cinebooking_auth_v3`. Before switching accounts, the test captures the exact customer `NEW_DEVICE` alert ID from `/api/me/security/alerts`; after Admin login it waits for `/api/admin/security/alerts`, requires that the same alert ID, customer email and `NEW_DEVICE` event are present in the Admin API response, and finally verifies the matching Admin table row including the Brave device label. No Flyway migration or production security behavior is changed by this RC-only E2E hardening.

### V46 RC5 Playwright navigation-context stabilization

The `v46.0.0-rc.4` disposable full-stack run exposed two remaining Playwright races rather than production feature failures. The V41 notification journey called authenticated APIs through `page.evaluate(fetch(...))` immediately after a notification click deliberately hard-navigated back to `/notifications`, so Chromium could destroy the JavaScript execution context while the assertion helper was running. The V46 security journey likewise polled `localStorage` through `page.evaluate` while the login page was performing its role-based hard navigation, which could destroy the execution context before the poll completed.

RC5 removes those navigation-sensitive browser-evaluation helpers. The notification journey captures the real registration `AuthResponse`, keeps its access token, and performs authenticated verification through Playwright `BrowserContext.request`, which is independent of page document replacement. The V46 security journey now synchronizes logout with the real Header logout request and waits for the application's `/` redirect to finish before opening `/login`; login validity is asserted directly from the real `/api/auth/login` JSON response rather than polling `localStorage`. Customer and Admin security-alert API checks also use `BrowserContext.request` with the exact bearer tokens returned by login. The Brave UI assertions, exact `NEW_DEVICE` alert ID/email contract, notification archive/restore/read contract, database schema, Flyway V46 migration and production security behavior are unchanged.

Because `v46.0.0-rc.4` is immutable, publish the next candidate as `v46.0.0-rc.5`; do not move RC1-RC4 tags.


### V46 RC6 Playwright auth-body retention stabilization

RC5 proved that the remaining release failures were not application API failures: Chromium returned successful authentication status codes, but Playwright could no longer retrieve the browser network response body after the registration/login navigation had replaced the document. Both the V41 notification journey and the V46 security journey failed at `Response.json()` with `Network.getResponseBody: No resource with given identifier found`.

RC6 keeps the real UI registration/login flows and still synchronizes on the real HTTP status codes, but no longer asks Chromium DevTools for an authentication response body after navigation. After the expected destination URL is stable, the tests read `cinebooking_auth_v3` through `BrowserContext.storageState()`, which is independent of the page execution context and retained network-response body. Authenticated API assertions continue through `BrowserContext.request`. The V41 archive/restore/read contract and the V46 Brave trusted-device plus exact customer `NEW_DEVICE` Admin visibility contract are unchanged. No production authentication logic, Flyway migration, database schema or reference data changes are included.

Because `v46.0.0-rc.5` is immutable, publish the next candidate as `v46.0.0-rc.6`; do not move RC1-RC5 tags.

## V47 - Payment Gateway & Operations 2.0

V47 builds on the V37 gateway hardening without fabricating real VNPay/MoMo activity. Local/reference data still uses `MOCK` only unless merchant credentials are actually configured. Checkout now exposes only enabled providers: an unconfigured VNPay or MoMo gateway is not shown as a selectable payment method.

### What V47 adds

- Flyway `V47__payment_gateway_operations_2.sql`; pgAdmin now shows **50 tables**.
- `payment.attempt_no` and `retry_of_payment_id` preserve retry lineage for each booking.
- `CANCELLED` payment state lets a customer cancel only the current payment attempt while the booking remains valid until its existing expiry.
- Safe retry is limited to `FAILED`/`CANCELLED` attempts while the booking is still `PENDING` and not expired; `REVIEW` is never auto-retried because the provider may already have captured money.
- New append-only `payment_event` timeline records create/session/success/failure/cancel/retry/webhook/reconciliation events.
- Customer APIs: `POST /api/payments/{paymentId}/cancel`, `POST /api/payments/{paymentId}/retry`, `GET /api/payments/{paymentId}/timeline`.
- Admin APIs: `GET /api/admin/payments/{paymentId}/timeline`, `POST /api/admin/payments/reconcile-due`, plus the existing single-payment reconciliation endpoint.
- Provider readiness exposes display name, enabled/configured flags, sandbox/production mode and capabilities. The booking UI hides unavailable real gateways instead of showing unusable VNPay/MoMo choices.
- Optional automatic reconciliation is **off by default** and can be enabled with `PAYMENT_AUTO_RECONCILE_ENABLED=true`. Backoff/failure counters are persisted on each payment.
- `/payments` now shows attempt number, cancel/retry actions and event timeline. `/admin/payments` shows provider readiness, due-reconciliation count, attempt lineage and timeline.
- Reference data remains honest: the ten deterministic payment rows and V47 `payment_event` rows are local `MOCK` history; no seed row pretends a VNPay/MoMo transaction occurred.

### V47 reconciliation configuration

```env
PAYMENT_AUTO_RECONCILE_ENABLED=false
PAYMENT_RECONCILE_SCAN_MS=60000
PAYMENT_RECONCILE_MIN_AGE_SECONDS=45
PAYMENT_RECONCILE_MAX_BATCH=20
PAYMENT_RECONCILE_MAX_BACKOFF_SECONDS=900
```

Real provider credentials remain deployment secrets and are never committed. When VNPay/MoMo credentials are blank, only enabled local methods are shown to customers.

### V47 verification

```powershell
python .\tools\verify_v47_payment_gateway_operations.py
python .\tools\verify_seed_demo_50.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v47.ps1
```

Run/update the stack without deleting persistent volumes:

```powershell
docker compose up -d --build
docker compose ps
```

For the first V47 release candidate use: `v47.0.0-rc.1` (stable target `v47.0.0`).

```text
branch: main
version: 47.0.0
rc_number: 1
```

## V48 - Concession & Inventory 2.0

V48 turns the original V19 global concession inventory into a cinema-scoped operational model. The global `concession_product` catalog remains the product master for compatibility, while stock availability and selling price used by checkout are resolved from the cinema that owns the selected showtime.

### What V48 adds

- Flyway `V48__multi_cinema_concession_inventory_2.sql`; pgAdmin now shows **52 tables**: 51 application tables plus `flyway_schema_history`.
- New `cinema_concession_inventory` stores `stock_on_hand`, `stock_reserved`, `low_stock_threshold`, `target_stock` and branch active state for every cinema/product pair.
- New `cinema_concession_price` stores the effective selling price per cinema without overwriting the global catalog price.
- `inventory_movement` now carries `cinema_id` and `reference_key`; movement types add `WASTE`, `TRANSFER_OUT` and `TRANSFER_IN` while preserving V19/V40 events.
- Customer `GET /api/commerce/products?cinemaId=<uuid>` returns branch availability and effective price. `/booking/[showtimeId]` automatically requests the product catalog for that showtime's cinema.
- Booking creation resolves the auditorium cinema before building concessions. The same cinema is used for branch price quoting, pessimistic inventory reservation, payment-success sale deduction, cancellation release and refund restock.
- Admin `/admin/inventory` is now branch-first: branch selector, low/sold-out KPIs, restock, physical-count SET, waste write-off, target/threshold controls, branch price override and atomic inter-cinema transfer.
- Transfers only use **available** stock (`on hand - reserved`), so stock already reserved by a `PENDING` booking cannot be moved to another cinema.
- Loyalty concession redemption consumes inventory from the staff member's assigned cinema and writes `LOYALTY_REWARD` with branch identity.
- New products automatically receive branch inventory/price rows for every existing cinema; a new product starts with zero branch stock until an operator restocks it.
- Reference data remains realistic: the 10 reference cinemas and 10 real-named concession products receive 100 deterministic branch-stock rows and 100 deterministic branch-price rows. Payment reference history remains `MOCK` only; no VNPay/MoMo activity is fabricated.

### V48 APIs

```text
GET  /api/admin/inventory/branches
GET  /api/admin/inventory?cinemaId=<uuid>
GET  /api/admin/inventory/movements?cinemaId=<uuid>&productId=<optional-uuid>
POST /api/admin/inventory/adjustments
POST /api/admin/inventory/transfers
PUT  /api/admin/inventory/prices
GET  /api/commerce/products?cinemaId=<uuid>
```

Adjustment operations are `RESTOCK`, `SET` and `WASTE`. `SET` cannot lower physical stock below the quantity already reserved for pending bookings; `WASTE` cannot consume reserved stock.

### V48 realistic reference data

Run from the repository root on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\seed-reference-52-tables.ps1
powershell -ExecutionPolicy Bypass -File .\tools\check-reference-52-table-counts.ps1
```

The V48 seed is UTF-8 safe, reuses the eight canonical V29 movies, keeps real Vietnamese names/products/assets, leaves Flyway metadata untouched and rejects seeded VNPay/MoMo rows.

### V48 verification

```powershell
python .\tools\verify_v47_payment_gateway_operations.py
python .\tools\verify_v48_concession_inventory_2.py
python .\tools\verify_seed_demo_52.py
python .\tools\verify_reference_data_52.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v48.ps1
```

Run/update the stack without deleting persistent volumes:

```powershell
docker compose up -d --build
docker compose ps
```

For the first V48 release candidate use `v48.0.0-rc.1` with stable target `v48.0.0`:

```text
branch: main
version: 48.0.0
rc_number: 1
```


### V48 RC2 - inventory transfer E2E branch provisioning fix

The disposable Playwright stack starts from the historical migration baseline, which contains only one cinema. V48 inventory transfers require two branches, so RC1 could reach `/admin/inventory` successfully but the branch selector contained exactly one option and the transfer journey timed out before any inventory API mutation ran.

RC2 keeps the production model honest instead of weakening the test: creating a cinema through `POST /api/admin/cinemas` now provisions zero-on-hand branch inventory plus base-price rows for every existing concession product. The V48 Playwright journey creates a second branch through that real API before exercising restock, waste, branch pricing, and transfer. Existing V48 schema stays unchanged; Flyway remains V48 and pgAdmin remains 52 public tables.

### V48 compile hotfix - CommerceService lambda capture

## V49 - Smart Showtime Planning 2.0

V49 upgrades the original V33/V34 showtime planner from fixed manual time lists into a cinema-wide scheduling assistant. The existing manual preview/commit flow is preserved, while Smart Planner scans every auditorium in the selected cinema, rejects occupied or maintenance-blackout windows, includes the configured turnaround buffer, and ranks the remaining candidates using historical occupancy plus deterministic peak-hour/weekend demand signals.

### What V49 adds

- Flyway `V49__smart_showtime_planning_2.sql`; pgAdmin now shows **53 public tables**: 52 application tables plus `flyway_schema_history`.
- New `showtime_planning_run` audit table records each committed smart plan, input window, strategy, historical sample count, conflict count, actor and serialized plan evidence.
- `showtime.planning_source`, `planning_run_id` and `planning_score` distinguish `MANUAL`, `BATCH` and `SMART` showtimes without changing customer booking contracts.
- `POST /api/admin/showtime-planner/smart/preview` is a dry run. It scans all rooms in the cinema and returns per-day suggested slots with score, historical occupancy and human-readable reasons.
- `POST /api/admin/showtime-planner/smart/commit` pessimistically locks the cinema rooms, recomputes the plan, writes the durable run and creates only the recomputed conflict-free slots.
- `GET /api/admin/showtime-planner/smart/runs` exposes the latest planning audit history.
- Historical demand uses past `booking_seat` occupancy. When movie-specific history is sparse, V49 falls back to cinema history and finally to deterministic time-of-day/weekend heuristics.
- Same-movie starts are spaced by at least 45 minutes across the cinema to avoid accidental concurrent cannibalization.
- The existing V34 manual batch planner remains available and now stamps its created showtimes as `BATCH`.

### V49 realistic reference data

`tools/seed-demo-53-tables-10-rows.sql` keeps the existing realistic V48 data and adds ten deterministic committed planning runs. The ten reference showtimes are linked to those runs with `SMART` provenance and planning scores. The seed still reuses the eight canonical V29 movies, leaves Flyway metadata untouched, and keeps reference payment history MOCK-only.

### V49 verification

```powershell
python .\tools\verify_v49_smart_showtime_planning_2.py
python .\tools\verify_reference_data_53.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v49.ps1
```

For the first V49 candidate use stable target `49.0.0` and `rc_number: 1`. The release workflows retain all V46-V48 gates and add the V49 source/53-table checks plus the dedicated Smart Planner Playwright journey.

---

## V50 - Recommendation Intelligence 2.0

V50 nâng Recommendation Engine cũ thành hồ sơ gu phim có thể giải thích và cho phép người dùng tinh chỉnh trực tiếp.

### Database

Migration mới: `V50__recommendation_intelligence_2.sql`.

V50 thêm bảng `recommendation_feedback` với một phản hồi hiện hành trên mỗi cặp `user/movie`:

- `MORE_LIKE_THIS`: tăng mạnh trọng số các thể loại tương tự và tạo anchor giải thích "Vì bạn muốn xem thêm phim giống ...".
- `LESS_LIKE_THIS`: giảm trọng số gu tương tự mà không ẩn phim khỏi toàn hệ thống.
- `HIDE`: loại phim khỏi danh sách gợi ý cá nhân.

Bảng có unique `(user_id,movie_id)` và index theo user recency / movie feedback type. Migration không tự bịa lịch sử feedback; reference/dev seed nằm riêng trong bộ 54 bảng.

Sau V50 có 53 application tables + `flyway_schema_history` = **54 public tables trong pgAdmin**.

### Hybrid taste profile V50

Algorithm hiện tại: `V50-HYBRID-TASTE-2`.

Hồ sơ gu kết hợp:

- Favorites.
- Review tích cực và review thấp (negative affinity).
- Booking `CONFIRMED`.
- Click/view recommendation trong 120 ngày với trọng số giảm theo thời gian.
- Explicit MORE/LESS/HIDE feedback.
- Rạp thường xem từ lịch sử booking.
- Khung giờ thường xem: morning / afternoon / evening / late.
- Popularity 30 ngày và lịch chiếu sắp tới làm tín hiệu bổ trợ, không lấn át gu cá nhân.

Recommendation item trả thêm `confidence`, `signals`, `feedback` và reason có thể giải thích. Candidate đã `HIDE` bị loại khỏi personalized list.

### Customer Taste Center

Trang mới: `/for-you`.

Người dùng xem được:

- Top genres.
- Rạp thường xem.
- Khung giờ thường xem.
- Số tín hiệu hồ sơ / feedback / hidden count.
- Recommendation confidence và các signal chip.
- Nút **Thêm tương tự**, **Ít tương tự**, **Ẩn**, và **Xóa phản hồi**.

Header và Home personalized section đều liên kết tới Taste Center.

### API

- `GET /api/recommendations/profile` - authenticated taste profile.
- `PUT /api/recommendations/feedback` - upsert MORE/LESS/HIDE.
- `DELETE /api/recommendations/feedback/{movieId}` - clear explicit feedback.
- Các API V25 `/home`, `/trending`, `/similar/{movieId}`, `/events` vẫn giữ tương thích.

### Reference data / release gates

- `tools/seed-demo-54-tables-10-rows.sql`
- `tools/seed-demo-54-tables.ps1`
- `tools/seed-reference-54-tables.ps1`
- `tools/check-demo-54-table-counts.ps1`
- `tools/check-reference-54-table-counts.ps1`
- `tools/verify_seed_demo_54.py`
- `tools/verify_reference_data_54.py`
- `tools/verify_v50_recommendation_intelligence_2.py`
- `tools/diagnose-v50.ps1`

Reference V50 thêm 10 explicit taste-feedback rows nhưng vẫn giữ nguyên các nguyên tắc dữ liệu trước đây: không thêm phim placeholder, 8 canonical V29 movies được tái sử dụng, payment reference chỉ `MOCK`, và không ghi vào `flyway_schema_history`.

Playwright mới: `frontend/e2e/recommendation-intelligence-v50.spec.ts`, kiểm tra user tạo tài khoản, mở `/for-you`, gửi `MORE_LIKE_THIS`, profile được cá nhân hóa, reload vẫn giữ feedback, rồi `HIDE` loại phim khỏi gợi ý.


### V50 compile hotfix - JdbcTemplate query overload

Full Maven compilation exposed an overloaded `JdbcTemplate.query(...)` ambiguity in `RecommendationService.popularity(...)`. The old expression lambda returned the value from `Map.put(...)`, so Java could match both `ResultSetExtractor<T>` and `RowCallbackHandler`. The callback is now a block lambda with no return value, which selects the row-callback overload unambiguously while preserving the same popularity aggregation logic. `verify_v50_recommendation_intelligence_2.py` includes a regression check for this source shape. No database migration or API contract changes are introduced by this hotfix.

---

## V51 - Analytics & Forecasting 3.0

V51 mở rộng `/admin/analytics` từ dashboard mô tả thành lớp phân tích + dự báo có thể vận hành trên hai backend replica mà không ghi snapshot trùng.

### Database / Flyway

Migration mới: `V51__analytics_forecasting_3.sql`.

V51 thêm đúng hai application tables:

- `cinema_concession_cost_basis`: giá vốn theo cặp `(cinema_id, product_id)`. Migration **không sinh cost giả**; thiếu row nghĩa là cost chưa biết.
- `analytics_snapshot`: snapshot `DAILY`, `WEEKLY`, `MONTHLY` với revenue, tickets, capacity, occupancy, cost coverage, nullable concession cost/gross margin và forecast 7 ngày.

Sau V51 có **55 application tables + `flyway_schema_history` = 56 public tables trong pgAdmin**.

### Forecast / comparison

Algorithm được version hóa bằng hằng số:

```text
V51-WEEKDAY-WEIGHTED-MA-1
```

Mỗi ngày trong 7 ngày kế tiếp lấy đúng cùng thứ của bốn tuần gần nhất, theo trọng số `4 / 3 / 2 / 1`. Dashboard đồng thời so sánh kỳ hiện tại với kỳ liền trước có cùng độ dài cho revenue, booking, tickets và occupancy.

V51 tiếp tục hiển thị analytics theo rạp, phim, phòng chiếu và khung giờ; dữ liệu V43 CSV/XLSX vẫn giữ tương thích.

### Margin và branch cost basis

Cost bắp nước là dữ liệu vận hành theo chi nhánh. API mới:

```text
GET /api/admin/analytics/cost-basis?cinemaId=<optional-uuid>
PUT /api/admin/analytics/cost-basis
```

`PUT` nhận `cinemaId`, `productId` và `unitCost`. Gửi `unitCost: null` xóa cost basis để trở lại trạng thái chưa biết.

Quy tắc quan trọng: **cost chưa biết luôn là `NULL`, không đổi thành `0`**. Nếu chỉ một phần concession units có cost basis, `concessionCost` và `grossMargin` trả `null`; `costCoverageRate` cho biết mức dữ liệu cost đã phủ. Điều này ngăn dashboard tạo biên lợi nhuận ảo khi dữ liệu giá vốn chưa đủ.

### Scheduled snapshots / multi-replica safety

`AnalyticsSnapshotJob` chạy theo:

```text
ANALYTICS_SNAPSHOT_ENABLED=true
ANALYTICS_SNAPSHOT_SCAN_MS=900000
```

Mỗi transaction chọn cinema bằng:

```sql
SELECT id FROM cinema ORDER BY id FOR UPDATE SKIP LOCKED;
```

Hai backend replica vì vậy bỏ qua cinema đang bị replica kia khóa. Snapshot còn có unique `(cinema_id, period_kind, period_start)` và upsert idempotent, tạo hai lớp chống ghi trùng.

### V51 CI/reference fixture (không dùng để thay dữ liệu thật)

Bộ reference mới:

```text
tools/seed-demo-56-tables-10-rows.sql
tools/seed-demo-56-tables.ps1
tools/check-demo-56-table-counts.sql
tools/check-demo-56-table-counts.ps1
tools/verify_seed_demo_56.py
tools/verify_reference_data_56.py
tools/seed-reference-56-tables.ps1
tools/check-reference-56-table-counts.ps1
```

Bộ `seed-demo-56-*` là **fixture deterministic cho CI/regression**, không phải seed được khuyến nghị cho database nghiệp vụ đang dùng. Fixture vẫn không tạo phim mới: 8 phim V29 hiện có được tái sử dụng. Với database thật, dùng `tools/seed-v51-real-data.ps1`; script đó không tạo cinema/product/booking/payment hoặc cost basis giả, và snapshot được tính từ dữ liệu giao dịch hiện có.

### V51 verification / release

```powershell
python .\tools\verify_v43_analytics_excel_detail.py
python .\tools\verify_v43_analytics_csv_detail.py
python .\tools\verify_v46_security_account_protection.py
python .\tools\verify_v47_payment_gateway_operations.py
python .\tools\verify_v48_concession_inventory_2.py
python .\tools\verify_v49_smart_showtime_planning_2.py
python .\tools\verify_v50_recommendation_intelligence_2.py
python .\tools\verify_v51_analytics_forecasting_3.py
python .\tools\verify_v51_utf8_real_data.py
python .\tools\verify_seed_demo_56.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v51.ps1
```

Playwright journey mới: `frontend/e2e/analytics-forecasting-v51.spec.ts`. Journey xác minh period comparison, forecast marker, margin NULL semantics, auditorium analytics, scheduler lock text và thao tác xóa branch cost basis về trạng thái chưa biết.

Build runtime mà không xóa volume:

```powershell
docker compose up -d --build
docker compose ps
```

Release lifecycle V51 dùng candidate `v51.0.0-rc.1`, stable `v51.0.0`; CI giữ toàn bộ gate V50 và thêm V51 source/56-table checks.

### V51 real-data refresh / UTF-8 runtime check

V51 có thêm hai script dùng cho database thật của máy local:

```text
tools/seed-v51-real-data.sql
tools/seed-v51-real-data.ps1
tools/check-v51-data-utf8.sql
tools/check-v51-data-utf8.ps1
tools/verify_v51_utf8_real_data.py
```

`seed-v51-real-data.ps1` chỉ refresh `analytics_snapshot` từ `payment`, `booking`, `booking_seat`, `booking_concession`, `showtime`, `auditorium`, `seat` và cost basis thật đang có. Script không insert phim, rạp, sản phẩm, booking, payment hoặc cost basis giả.

Nếu `cinema_concession_cost_basis` chưa có dữ liệu, UI Analytics hiển thị `NULL / Chưa biết`; gross margin chỉ tính khi cost coverage đầy đủ.

# Vận hành / test / build V51

## Kiến trúc

```text
Browser / PWA
      |
    nginx
   /     \
backend-1 backend-2
   |         |
   +---- PostgreSQL 18.4 (UTF8)
   +---- Redis 8.8
```

Docker Compose services: `postgres`, `redis`, `backend-1`, `backend-2`, `frontend`, `nginx`. Public HTTP mặc định là `http://localhost`.

## Yêu cầu môi trường

```text
Docker Desktop / Docker Engine + Compose
Java 25 nếu chạy backend ngoài Docker
Node.js 24 nếu chạy frontend ngoài Docker
Python 3 cho source verifiers
Windows PowerShell 5.1+
```

Kiểm tra:

```powershell
docker version
docker compose version
java -version
node --version
python --version
```

## Environment variables

Tạo `.env` local từ `.env.example`, sau đó chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\init-env.ps1
```

Kiểm tra file nhạy cảm không bị Git track:

```powershell
git ls-files .env "backups/*.dump" "backups/*.dump.sha256"
```

Lệnh trên phải không trả gì.

## 1. Test source trước khi build

```powershell
python .\tools\verify_v43_analytics_excel_detail.py
python .\tools\verify_v43_analytics_csv_detail.py
python .\tools\verify_v46_security_account_protection.py
python .\tools\verify_v47_payment_gateway_operations.py
python .\tools\verify_v48_concession_inventory_2.py
python .\tools\verify_v49_smart_showtime_planning_2.py
python .\tools\verify_v50_recommendation_intelligence_2.py
python .\tools\verify_v51_analytics_forecasting_3.py
python .\tools\verify_v51_utf8_real_data.py
python .\tools\verify_seed_demo_56.py
```

Hoặc chạy full diagnostic:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v51.ps1
```

## 2. Test database baseline trước build

```powershell
docker compose ps

docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SHOW server_encoding;"
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT installed_rank,version,description,success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"
```

`server_encoding` phải là `UTF8`. Nếu đang ở V50 baseline thì migration cuối trước build là V50.

## 3. Build V51

```powershell
docker compose up -d --build
docker compose ps
```

Không dùng trong update bình thường:

```powershell
docker compose down -v
```

`-v` xóa volume database.

## 4. Kiểm tra Flyway V51 và 56 bảng

```powershell
docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT installed_rank,version,description,success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 5;"

docker compose exec -T postgres psql -U cinebooking -d cinebooking -c "SELECT COUNT(*) AS public_tables FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
```

Kết quả V51 mong đợi:

```text
Flyway latest: 51
55 application tables
+ flyway_schema_history
= 56 public tables
```

## 5. Refresh dữ liệu V51 từ dữ liệu thật

Chạy sau khi V51 build xong:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\seed-v51-real-data.ps1
```

Script này:

- xác nhận PostgreSQL UTF-8;
- xác nhận đủ 8 phim V29 hiện có;
- không tạo phim/rạp/product/booking/payment giả;
- không tự sinh `unit_cost`;
- tính `analytics_snapshot` từ giao dịch thật hiện có trong database;
- giữ `concession_cost`/`gross_margin = NULL` khi cost coverage chưa đủ.

Giá vốn bắp nước phải nhập từ UI `/admin/analytics` hoặc import từ nguồn chi phí thật. Không suy diễn giá vốn từ giá bán.

## 6. Kiểm tra database, 8 phim và UTF-8 sau seed

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\check-v51-data-utf8.ps1
```

Checker xác nhận:

```text
server_encoding = UTF8
client_encoding = UTF8
Flyway latest = 51
public tables >= 56
8/8 phim V29 có sẵn
analytics_snapshot có dữ liệu
không phát hiện mojibake phổ biến trong movie/cinema/product/user text
```

`cinema_concession_cost_basis` được phép rỗng nếu chưa có giá vốn thật. Đó là trạng thái `Chưa biết`, không phải lỗi seed.

## 7. Kiểm tra text tiếng Việt trên web

Sau khi stack lên, mở:

```text
http://localhost
http://localhost/admin/analytics
```

Cần nhìn thấy đúng dấu các chuỗi như `Dự báo 7 ngày tới`, `Chưa biết`, `Giá vốn`, tên phim V29 và tên rạp/sản phẩm trong database.

## 8. Frontend lint/build

Không cần `cd frontend`; chạy từ project root:

```powershell
npm --prefix .\frontend install
npm --prefix .\frontend run lint
npm --prefix .\frontend run build
```

## 9. Playwright V51

Playwright chạy trên máy host cần dependency dev trong `frontend/node_modules`. Nếu gặp `Cannot find module '@playwright/test'`, chạy lại `npm --prefix .\frontend install` trước.

```powershell
npm --prefix .\frontend install
npm --prefix .\frontend exec -- playwright install chromium
.\frontend\node_modules\.bin\playwright.cmd test --config=.\frontend\playwright.config.ts analytics-forecasting-v51.spec.ts --project=chromium
```

## 10. Backup / verify / restore PostgreSQL

Thư mục backup an toàn của dự án là `./backups` (trên Windows PowerShell có thể dùng `.\backups`). Git chỉ theo dõi `backups/.gitkeep`; các file `*.dump` và `*.dump.sha256` phải luôn được ignore.

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\backup-db.ps1
powershell -ExecutionPolicy Bypass -File .\tools\verify-db-backup.ps1 -BackupPath .\backups\<file>.dump
powershell -ExecutionPolicy Bypass -File .\tools\test-v27.ps1
```

Restore thật chỉ khi đã xác nhận backup:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\restore-db.ps1 -BackupPath .\backups\<file>.dump -ConfirmRestore
```

## 11. Commit an toàn

```powershell
git ls-files .env "backups/*.dump" "backups/*.dump.sha256"
git add -A
git status --short
git commit -m "Add V51 Analytics and Forecasting 3.0 UTF-8 real-data hardening"
git push
```

Lệnh `git ls-files` đầu tiên phải không trả gì.

## 12. Release V51

```text
main CI
   ↓
V43 CSV/XLSX regression
   ↓
V46 → V50 regression
   ↓
V51 source + UTF-8/real-data static gate
   ↓
Flyway V51 / 56-table integration
   ↓
v51.0.0-rc.1
   ↓
Docker smoke
   ↓
Playwright Chromium
   ↓
v51.0.0
   ↓
GitHub Release
```

## 13. Project structure

```text
backend/                 Spring Boot backend
frontend/                Next.js frontend + Playwright
infra/nginx/             reverse proxy/load balancer
tools/                   diagnostics, verifiers, seed/check scripts, backup/restore
backups/.gitkeep         local backup placeholder
.github/workflows/       CI / RC / Stable Release
docker-compose.yml       local/full-stack orchestration
README.md                tài liệu dự án
```

## 14. Security / production notes

- Không commit JWT/SMTP/payment secret, `.env` hoặc database dump.
- Không dùng demo admin password trên production.
- Không expose PostgreSQL/Redis trực tiếp ra Internet.
- Dùng HTTPS trên reverse proxy/load balancer production.
- Backup DB trước migration lớn.
- Không dùng `docker compose down -v` cho update bình thường.
- Runtime success chỉ được chốt khi CI + Docker smoke + Playwright chạy xanh.

## V52 - PWA / Mobile Experience 3.0

V52 nâng nền PWA V26 thành trải nghiệm mobile có kiểm soát và không làm yếu các nguyên tắc bảo mật hiện có. Service Worker `v52` **không cache `/api/**` hoặc private navigation**, vé QR offline được lưu riêng trong IndexedDB theo đúng owner và được revalidate khi có mạng. Vé bị chuyển, hoàn, mất quyền hoặc không còn tồn tại sẽ chuyển sang `STALE` và QR cache bị ẩn.

### Database / migration

Migration mới:

```text
V52__pwa_mobile_experience_3.sql
```

Thêm `pwa_device` để quản lý installation/browser theo tài khoản. Sau migrate:

```text
56 application tables
+ flyway_schema_history
= 57 public tables
```

`pwa_device` có thể tồn tại khi push OFF. Chỉ một **PushSubscription thật từ browser** mới được phép ghi `push_endpoint`, `p256dh`, `auth_secret`. API device response không trả ba credential này về frontend. Reference fixture V52 tạo 10 thiết bị tự nhiên nhưng luôn `push_enabled=false` và credential `NULL`.

### Background Web Push / VAPID

Mặc định production/local vẫn an toàn:

```env
WEB_PUSH_ENABLED=false
WEB_PUSH_VAPID_PUBLIC_KEY=
WEB_PUSH_VAPID_PRIVATE_KEY=
WEB_PUSH_SUBJECT=mailto:admin@cinebooking.local
WEB_PUSH_TTL_SECONDS=3600
```

Tạo key local từ project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\generate-vapid-keys.ps1
```

Script chỉ in key ra console để người vận hành tự đưa vào `.env`; không ghi secret vào source. Chỉ bật `WEB_PUSH_ENABLED=true` sau khi đã cấu hình cặp key thật. Khi chưa bật, Notification Center giữ `FOREGROUND_FALLBACK` của V41 khi website đang mở.

Background push dùng P-256 ECDH + HKDF + `aes128gcm` và VAPID ES256. Notification chỉ được dispatch sau transaction commit. Server chỉ chấp nhận PushSubscription có endpoint HTTPS public, key P-256/auth hợp lệ, không follow redirect khi gửi push và chặn việc chiếm device key/endpoint giữa hai tài khoản. Subscription 404/410 hoặc lỗi lặp lại sẽ bị server vô hiệu hóa. Logout best-effort unsubscribe PushSubscription trong browser rồi gỡ registration thiết bị hiện tại khỏi server để giảm nguy cơ tài khoản cũ tiếp tục nhận push trên browser đó.

### Mobile Center và offline ticket

Trang mới:

```text
http://localhost/mobile
```

Có trạng thái online/offline, standalone/browser, persistent storage, usage/quota, Background Web Push và danh sách thiết bị. `/offline-tickets` có đồng bộ server, trạng thái `FRESH / STALE / UNKNOWN`, `ticketVersion` và thời điểm xác minh gần nhất. Service Worker không dùng cache để lưu API/QR riêng tư.

### V52 source verification

Tất cả lệnh chạy từ:

```text
D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
```

```powershell
python .\tools\verify_v46_security_account_protection.py
python .\tools\verify_v47_payment_gateway_operations.py
python .\tools\verify_v48_concession_inventory_2.py
python .\tools\verify_v49_smart_showtime_planning_2.py
python .\tools\verify_v50_recommendation_intelligence_2.py
python .\tools\verify_v51_analytics_forecasting_3.py
python .\tools\verify_v52_pwa_mobile_3.py
python .\tools\verify_reference_data_57.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v52.ps1
```

### Build / migrate V52

```powershell
docker run --rm `
  -v "$((Resolve-Path .\backend).Path):/app" `
  -w /app `
  maven:3.9-eclipse-temurin-25 `
  mvn -B -ntp test

docker compose up -d --build
docker compose ps
```

Kiểm tra Flyway/table count:

```powershell
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history ORDER BY installed_rank DESC LIMIT 7;"
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT COUNT(*) AS public_tables FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
```

Mong đợi:

```text
52 | pwa mobile experience 3 | t
public_tables = 57
```

### V52 CI/reference fixture

Chỉ dùng khi cần deterministic reference/CI dataset:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\seed-reference-57-tables.ps1
powershell -ExecutionPolicy Bypass -File .\tools\check-reference-57-table-counts.ps1
```

Không cần xóa database và không dùng `docker compose down -v` cho update bình thường.

### V52 Playwright / release

V52 thêm `frontend/e2e/pwa-mobile-v52.spec.ts`, đưa tổng bộ suite lên 20 journey. Test xác minh browser thật được đăng ký thành PWA device và trong môi trường CI không có VAPID thì hệ thống phải báo `FOREGROUND_FALLBACK` / `Push OFF`, không bịa PushSubscription.

Sau Maven, Docker và main CI đều xanh, Stable Release dùng:

```text
version: 52.0.0
rc_number: 1
```

Flow:

```text
main CI
  -> V46-V52 regression gates
  -> V52 / 57-table integration
  -> v52.0.0-rc.1
  -> Docker smoke
  -> 20 Playwright journeys
  -> v52.0.0
```

### V52 reference-seed natural-key collision hotfix

Khi chạy fixture 57 bảng trên một database đã có `analytics_snapshot` do scheduler V51 tạo, unique key `(cinema_id, period_kind, period_start)` có thể trùng với 10 row reference. Trước hotfix, `ON CONFLICT ... DO UPDATE` giữ nguyên primary key của row cũ, trong khi self-check yêu cầu 10 deterministic IDs `seed51:analytics-snapshot:*`, nên transaction bị rollback trước khi `pwa_device` được commit.

Hotfix chuẩn hóa deterministic ID ngay trong các natural-key upsert của `recommendation_feedback`, `cinema_concession_cost_basis`, `analytics_snapshot` và `pwa_device` bằng `id=EXCLUDED.id`. Vì đây là **CI/reference fixture**, hành vi này chỉ áp dụng khi chủ động chạy `seed-reference-57-tables.ps1`; migration/runtime production không thay đổi. Nếu database đang giữ dữ liệu nghiệp vụ thật, ưu tiên giữ nguyên dữ liệu và không chạy fixture chỉ để làm đầy bảng. `pwa_device` có thể hợp lệ ở trạng thái rỗng cho đến khi một người dùng đăng nhập/đăng ký thiết bị PWA.

## V53 - Operations Command Center 3.0

V53 hợp nhất các tín hiệu vận hành đã có từ V43-V52 thành một màn hình ra quyết định cho **Manager/Admin**. Đây là bản **read-only orchestration**: không tự đổi trạng thái payment, support, maintenance, inventory hoặc staff incident và không tạo cảnh báo giả.

Trang mới:

```text
http://localhost/admin/command-center
```

### Phạm vi V53

- Admin có thể xem **Toàn hệ thống** hoặc chọn một rạp cụ thể.
- Manager chỉ được xem rạp gắn với `staff_profile.cinema_id`; backend từ chối cinema khác, không chỉ ẩn ở frontend.
- Doanh thu hôm nay chỉ lấy `payment.status='SUCCESS'` theo timezone `Asia/Ho_Chi_Minh`.
- Booking/vé chỉ lấy dữ liệu `CONFIRMED`; occupancy tính từ ghế bán thật và sức chứa phòng, không dùng phần trăm giả.
- Payment attention chỉ đếm `REVIEW`.
- Support attention lấy case đang mở và SLA đã quá hạn.
- Maintenance attention lấy work order đang mở và `due_at` quá hạn.
- Staff Ops attention lấy `staff_incident.status='OPEN'`.
- Inventory attention dùng `stock_on_hand - stock_reserved` so với `low_stock_threshold`.
- Forecast 7 ngày tái sử dụng thuật toán V51 `V51-WEEKDAY-WEIGHTED-MA-1`.

### Database / migration

**V53 không tạo migration Flyway mới.** Migration cao nhất vẫn là:

```text
V52__pwa_mobile_experience_3.sql
```

Do đó schema vẫn giữ:

```text
56 application tables
+ flyway_schema_history
= 57 public tables
```

Không chạy seed mới chỉ để phục vụ Command Center. Mọi KPI/attention của V53 được tính từ dữ liệu nghiệp vụ hiện có.

### API V53

```text
GET /api/admin/command-center/cinemas
GET /api/admin/command-center/summary?cinemaId=<optional-uuid>
```

`/api/admin/command-center/**` cho phép `MANAGER` và `ADMIN`; rule này đứng trước generic `/api/admin/**` chỉ dành cho Admin.

### Test source V53

Chạy từ project root:

```powershell
bash tools/verify-v26-source.sh
python .\tools\verify_v44_maintenance_reliability.py
python .\tools\verify_v45_customer_support.py
python .\tools\verify_v46_security_account_protection.py
python .\tools\verify_v47_payment_gateway_operations.py
python .\tools\verify_v48_concession_inventory_2.py
python .\tools\verify_v49_smart_showtime_planning_2.py
python .\tools\verify_v50_recommendation_intelligence_2.py
python .\tools\verify_v51_analytics_forecasting_3.py
python .\tools\verify_v51_utf8_real_data.py
python .\tools\verify_v52_pwa_mobile_3.py
python .\tools\verify_v53_operations_command_center.py
python .\tools\verify_seed_demo_57.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v53.ps1
```

### Test bảng V53

V53 không đổi schema nên tiếp tục dùng checker 57 bảng:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\check-demo-57-table-counts.ps1
powershell -ExecutionPolicy Bypass -File .\tools\check-v51-data-utf8.ps1
```

Kỳ vọng Flyway vẫn V52 và `public_tables = 57`. Không dùng `docker compose down -v` cho update bình thường.

### CI / release V53

Main CI chạy source regression **V26-V53**, Maven, frontend lint/build, Docker validation và các gate dữ liệu hiện có. Browser E2E để GitHub Actions chạy trên disposable stack; không cần chạy Playwright local trước mỗi commit.

Release candidate đầu tiên:

```text
v53.0.0-rc.1
```

Stable target:

```text
v53.0.0
```

Workflow inputs:

```text
branch: main
version: 53.0.0
rc_number: 1
```

Nếu `v53.0.0-rc.1` đã tồn tại ở commit cũ, giữ tag immutable và tăng `rc_number` lên 2, 3, ...; không force-update RC cũ.

## V54 - Multi-Cinema Performance Benchmarking 3.0

V54 thêm lớp **performance analytics read-only** cho Manager/Admin, tập trung vào việc so sánh hiệu suất giữa các rạp bằng cùng một cửa sổ thời gian. V54 không tạo điểm số tùy ý, không seed doanh thu/occupancy và không thay đổi trạng thái booking/payment/showtime.

Trang mới:

```text
http://localhost/admin/performance
```

### Phạm vi V54

- Admin có thể benchmark **Toàn hệ thống** hoặc chọn một rạp cụ thể.
- Manager chỉ được xem rạp gắn với `staff_profile.cinema_id`; backend từ chối cinema khác.
- Chỉ hỗ trợ cửa sổ **7 ngày** và **30 ngày** để so sánh nhất quán.
- Kỳ hiện tại và kỳ trước luôn có cùng số ngày theo timezone `Asia/Ho_Chi_Minh`.
- Doanh thu chỉ lấy `payment.status='SUCCESS'`.
- Booking/vé chỉ lấy `booking.status='CONFIRMED'`; `booking_seat.released_at IS NOT NULL` không được tính là vé còn hiệu lực.
- Occupancy lấy ghế đã bán thực tế trên showtime và capacity thật của auditorium; ghế `BLOCKED` không tính vào capacity, showtime `CANCELLED` không tính.
- Branch ranking sắp theo doanh thu thật; `revenueSharePct` được tính từ tổng doanh thu trong đúng phạm vi đang xem.
- Growth với kỳ trước trả `NULL`/`Mới` khi kỳ trước bằng 0 nhưng kỳ hiện tại có doanh thu, thay vì bịa phần trăm tăng trưởng.
- Forecast 7 ngày tái sử dụng `AnalyticsForecastingService` V51 theo từng rạp rồi cộng lại cho phạm vi toàn hệ thống.
- Top phim xếp theo doanh thu payment SUCCESS; daily series giữ cả ngày 0 doanh thu để không làm đứt chuỗi thời gian.

### Database / migration V54

**V54 không tạo migration Flyway mới.** Migration cao nhất vẫn là:

```text
V52__pwa_mobile_experience_3.sql
```

Schema tiếp tục giữ:

```text
56 application tables
+ flyway_schema_history
= 57 public tables
```

Không chạy seed mới chỉ để làm đầy dashboard V54. Mọi KPI đều được tính từ giao dịch và lịch chiếu đang có.

### API V54

```text
GET /api/admin/performance/cinemas
GET /api/admin/performance/scorecard?periodDays=7&cinemaId=<optional-uuid>
```

`periodDays` chỉ nhận `7` hoặc `30`. `/api/admin/performance/**` cho phép `MANAGER` và `ADMIN`; rule đứng trước generic `/api/admin/**`.

### Test source V54

Chạy từ project root:

```powershell
bash tools/verify-v26-source.sh
python .\tools\verify_v44_maintenance_reliability.py
python .\tools\verify_v45_customer_support.py
python .\tools\verify_v46_security_account_protection.py
python .\tools\verify_v47_payment_gateway_operations.py
python .\tools\verify_v48_concession_inventory_2.py
python .\tools\verify_v49_smart_showtime_planning_2.py
python .\tools\verify_v50_recommendation_intelligence_2.py
python .\tools\verify_v51_analytics_forecasting_3.py
python .\tools\verify_v51_utf8_real_data.py
python .\tools\verify_v52_pwa_mobile_3.py
python .\tools\verify_v53_operations_command_center.py
python .\tools\verify_v54_performance_benchmarking.py
python .\tools\verify_seed_demo_57.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v54.ps1
```

### Test bảng V54

V54 không đổi schema nên vẫn kiểm tra 57 bảng:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\check-demo-57-table-counts.ps1
powershell -ExecutionPolicy Bypass -File .\tools\check-v51-data-utf8.ps1
```

Kỳ vọng Flyway vẫn V52 và `public_tables = 57`. Không dùng `docker compose down -v` cho update bình thường.

### CI / release V54

Main CI chạy source regression **V26-V54**, backend integration, frontend lint/build, Docker validation và các gate dữ liệu hiện có. Browser E2E có thêm journey V54 và để GitHub Actions chạy trên disposable stack.

Release candidate đầu tiên:

```text
v54.0.0-rc.1
```

Stable target:

```text
v54.0.0
```

Stable workflow inputs:

```text
version: 54.0.0
rc_number: 1
```

Nếu `v54.0.0-rc.1` đã tồn tại ở commit cũ, giữ tag immutable và tăng `rc_number` lên 2, 3, ...; không force-update RC cũ.


## V55 - Customer Retention & Cohort Intelligence 3.0

V55 bổ sung lớp **customer retention analytics read-only** cho Manager/Admin. Mục tiêu là trả lời khách nào là mới/quay lại, tỷ lệ repeat thực, khách đang ở giai đoạn nào của vòng đời và cohort nào quay lại trong 30 ngày. V55 không dùng churn score tùy ý, không gọi khách là “rời bỏ” bằng mô hình không giải thích được và không tạo dữ liệu booking/payment giả để làm đầy dashboard.

Trang mới:

```text
http://localhost/admin/retention
```

### Phạm vi V55

- Admin xem **Toàn hệ thống** hoặc chọn một rạp cụ thể.
- Manager chỉ xem rạp gắn với `staff_profile.cinema_id`; backend từ chối cinema khác.
- Dashboard hỗ trợ cửa sổ hoạt động **30 ngày** và **90 ngày**.
- Chỉ tài khoản `app_user.role='USER'` được tính vào retention; Manager/Admin không làm nhiễu chỉ số khách hàng.
- Khách được quy về `booking.purchaser_user_id`, tức người mua gốc. Ticket transfer không biến người nhận vé thành khách mua mới.
- Khách hoạt động là purchaser có ít nhất một `booking.status='CONFIRMED'` trong cửa sổ đang chọn.
- Khách mới là purchaser có **lần booking CONFIRMED đầu tiên trong chính phạm vi rạp đang xem** nằm trong cửa sổ.
- Khách quay lại là purchaser đã có lần mua CONFIRMED trước đầu cửa sổ và có mua lại trong cửa sổ hiện tại.
- Repeat customer là khách hoạt động có ít nhất 2 booking CONFIRMED trong lịch sử cùng phạm vi; `repeatCustomerRate` là tỷ lệ repeat / active.
- Revenue và revenue/customer chỉ lấy `payment.status='SUCCESS'` theo ngày thanh toán trong timezone `Asia/Ho_Chi_Minh`.
- Daily series zero-fill cả ngày không có khách; new/returning được phân loại theo first CONFIRMED booking.
- Cohort dùng tháng của lần mua CONFIRMED đầu tiên; chỉ cohort đã có **đủ 30 ngày quan sát** mới được đưa vào bảng. Retained 30d nghĩa là có booking CONFIRMED thứ hai sau lần đầu và không muộn hơn 30 ngày.
- Lifecycle là rule-based, các nhóm loại trừ nhau: `NEW_30D`, `ACTIVE_REPEAT`, `AT_RISK`, `DORMANT`, `LAPSED`. Đây là quy tắc theo first/last booking, không phải dự đoán AI.

### Database / migration V55

**V55 không tạo migration Flyway mới.** Migration cao nhất vẫn là:

```text
V52__pwa_mobile_experience_3.sql
```

Schema tiếp tục giữ:

```text
56 application tables
+ flyway_schema_history
= 57 public tables
```

Không seed thêm customer/booking/payment chỉ để làm retention đẹp hơn. Dashboard đọc dữ liệu giao dịch hiện có.

### API V55

```text
GET /api/admin/retention/cinemas
GET /api/admin/retention/scorecard?periodDays=30&cinemaId=<optional-uuid>
```

`periodDays` chỉ nhận `30` hoặc `90`. `/api/admin/retention/**` cho phép `MANAGER` và `ADMIN`; rule đứng trước generic `/api/admin/**`.

### Test source V55

Chạy từ project root:

```powershell
bash tools/verify-v26-source.sh
python .\tools\verify_v44_maintenance_reliability.py
python .\tools\verify_v45_customer_support.py
python .\tools\verify_v46_security_account_protection.py
python .\tools\verify_v47_payment_gateway_operations.py
python .\tools\verify_v48_concession_inventory_2.py
python .\tools\verify_v49_smart_showtime_planning_2.py
python .\tools\verify_v50_recommendation_intelligence_2.py
python .\tools\verify_v51_analytics_forecasting_3.py
python .\tools\verify_v51_utf8_real_data.py
python .\tools\verify_v52_pwa_mobile_3.py
python .\tools\verify_v53_operations_command_center.py
python .\tools\verify_v54_performance_benchmarking.py
python .\tools\verify_v55_customer_retention.py
python .\tools\verify_seed_demo_57.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v55.ps1
```

### Test bảng V55

V55 không đổi schema nên vẫn dùng 57-table gate:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\check-demo-57-table-counts.ps1
powershell -ExecutionPolicy Bypass -File .\tools\check-v51-data-utf8.ps1
```

Kỳ vọng Flyway vẫn V52, `public_tables = 57`, UTF-8 PASS và `required_empty_tables = 0`. Không dùng `docker compose down -v` cho update bình thường.

### CI / release V55

Main CI chạy source regression **V26-V55**, backend integration, frontend lint/build, Docker validation và các gate dữ liệu hiện có. Browser E2E có thêm journey V55 và để GitHub Actions chạy trên disposable stack.

Release candidate đầu tiên:

```text
v55.0.0-rc.1
```

Stable target:

```text
v55.0.0
```

Stable workflow inputs:

```text
version: 55.0.0
rc_number: 1
```

Nếu `v55.0.0-rc.1` đã tồn tại ở commit cũ, giữ tag immutable và tăng `rc_number` lên 2, 3, ...; không force-update RC cũ.

## V56 - Customer Value & RFM Intelligence 3.0

V56 bổ sung lớp **customer value analytics read-only** cho Manager/Admin, tiếp nối V55 Retention nhưng tập trung vào giá trị đã thực sự phát sinh. V56 không dự đoán CLV tương lai, không gán xác suất churn bằng mô hình ẩn và không tạo customer/payment giả để làm đẹp dashboard.

Trang mới:

```text
http://localhost/admin/customer-value
```

### Phạm vi V56

- Admin xem **Toàn hệ thống** hoặc chọn một rạp cụ thể; Manager chỉ xem `staff_profile.cinema_id` của mình.
- Tập khách active hỗ trợ cửa sổ **90 ngày** và **365 ngày**, dựa trên `booking.status='CONFIRMED'` + `confirmed_at` thật.
- Chỉ `app_user.role='USER'` được tính. Ticket transfer vẫn quy hoạt động về `booking.purchaser_user_id` của người mua gốc.
- Monetary chỉ lấy `payment.status='SUCCESS'`; **realized lifetime revenue** là tiền đã thu thật trong phạm vi rạp, không phải forecast CLV.
- RFM = **Recency / Frequency / Monetary**. Mỗi chiều được xếp quintile tương đối 1-5 trong chính tập khách active hiện tại; recency thấp hơn là tốt hơn, frequency/monetary cao hơn là tốt hơn.
- Segment V56 gồm `CHAMPIONS`, `LOYAL`, `NEW_RECENT`, `HIGH_VALUE`, `NEEDS_ATTENTION`, `DEVELOPING`. Các rule áp dụng theo thứ tự, loại trừ nhau và được hiển thị công khai trên UI.
- Value bands chia theo thứ hạng realized lifetime revenue: `TOP_10`, `NEXT_15`, `MIDDLE_25`, `LONG_TAIL`; dashboard đồng thời tính revenue concentration của top ~10%.
- Danh sách top customer chỉ hiển thị mã rút gọn dạng `KH-XXXXXXXX`; **không trả email/số điện thoại** trong contract V56.
- Toàn bộ service V56 chỉ đọc bằng `JdbcTemplate`; không update booking/payment/user và không phát sinh automation marketing.

### Database / migration V56

**V56 không tạo migration Flyway mới.** Migration cao nhất vẫn là:

```text
V52__pwa_mobile_experience_3.sql
```

Schema contract giữ nguyên:

```text
56 application tables
+ flyway_schema_history
= 57 public tables
```

### API V56

```text
GET /api/admin/customer-value/cinemas
GET /api/admin/customer-value/scorecard?periodDays=90
GET /api/admin/customer-value/scorecard?cinemaId=<uuid>&periodDays=365
```

`periodDays` chỉ nhận `90` hoặc `365` để source/UI/CI có cùng semantics.

### Test source V56

```powershell
python .\tools\verify_v55_customer_retention.py
python .\tools\verify_v56_customer_value_rfm.py
python .\tools\verify_seed_demo_57.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v56.ps1
```

Kỳ vọng gate mới:

```text
V56 verification: 54/54 checks passed
```

### Test bảng V56

V56 không đổi schema nên tiếp tục dùng 57-table gate:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\check-demo-57-table-counts.ps1
powershell -ExecutionPolicy Bypass -File .\tools\check-v51-data-utf8.ps1
```

Kỳ vọng vẫn là `57 public tables`, Flyway latest `V52`, UTF-8 PASS và không có required table rỗng ngoài các bảng optional đã được policy cho phép.

### CI / release V56

Main CI chạy source regression **V26-V56**. Browser E2E có thêm journey V56 `customer-value-v56.spec.ts`; build/test trình duyệt vẫn để GitHub Actions chạy trên disposable stack.

Release candidate mặc định:

```text
v56.0.0-rc.1
```

Stable:

```text
v56.0.0
```

Nếu RC1 đã trỏ tới commit cũ, tăng `rc_number` lên 2, 3, ...; không force-update tag RC đã phát hành.

## V57 - Booking & Seat Intelligence 3.0

V57 bám đúng roadmap **Booking & Seat Intelligence 3.0** và nâng lớp Seat Map/Booking UX hiện có thành một contract minh bạch, realtime và chống tranh chấp tốt hơn. V57 tái sử dụng schema/logic nền đã có từ V18 Dynamic Pricing, V24 contention hardening và V39 Seat Map UX; không tạo dữ liệu ghế hoặc giá giả.

### Phạm vi V57

- **Ghế đẹp nhất:** engine xếp hạng deterministic theo khoảng cách tới trung tâm hàng, chất lượng hàng, loại ghế và inventory preservation.
- **Nhóm ghế liền nhau:** chỉ gợi ý cụm ghế AVAILABLE liên tiếp đúng `partySize`, tối đa theo `app.seat-selection.max-seats`.
- **Tránh ghế trống đơn:** selection validation so sánh orphan-seat trước/sau và chỉ chặn orphan mới do lựa chọn hiện tại tạo ra.
- **Seat hold countdown realtime:** API trả `serverEpochMs` + `holdExpiresAtEpochMs`; frontend tính countdown theo mốc hết hạn server, tick 250ms và resync Redis định kỳ.
- **Chống tranh ghế nhiều client:** Redis Lua `ACQUIRE` kiểm tra toàn bộ key trước khi set, nên cùng một cụm ghế chỉ một user thắng; client còn lại nhận HTTP `409`.
- **Dynamic seat pricing:** suggestion và seat map dùng đúng `PricingService.PriceQuote`; UI hiển thị `dynamicAdjustment`/pricing rule thực, không sinh giá giả.
- **Minh bạch ranking:** suggestion trả `score`, `centerScore`, `rowScore`, `orphanSafetyScore`, `qualityLabel` và `reason` để UI giải thích vì sao một cụm ghế được xếp hạng cao.

### Database / migration V57

**V57 không tạo migration Flyway mới.** Migration cao nhất vẫn là:

```text
V52__pwa_mobile_experience_3.sql
```

Schema contract giữ nguyên:

```text
56 application tables
+ flyway_schema_history
= 57 public tables
```

### API / contract V57

```text
GET    /api/showtimes/{showtimeId}/seats
GET    /api/showtimes/{showtimeId}/seat-suggestions?count=2
POST   /api/showtimes/{showtimeId}/selection-validation
POST   /api/showtimes/{showtimeId}/holds
DELETE /api/showtimes/{showtimeId}/holds
```

`SeatMapResponse`/`HoldResponse` trả thêm server clock + absolute hold expiry để countdown không phụ thuộc drift đồng hồ client. `SeatSuggestion` trả breakdown ranking và `dynamicAdjustment` thực.

### Test source V57

```powershell
python .\tools\verify_v39_seat_map_ux.py
python .\tools\verify_v56_customer_value_rfm.py
python .\tools\verify_v57_booking_seat_intelligence.py
python .\tools\verify_seed_demo_57.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v57.ps1
```

Kỳ vọng gate mới:

```text
V57 verification: 70/70 checks passed
```

### Test bảng V57

V57 không đổi schema nên tiếp tục:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\check-demo-57-table-counts.ps1
powershell -ExecutionPolicy Bypass -File .\tools\check-v51-data-utf8.ps1
```

Kỳ vọng: `57 public tables`, Flyway latest `V52`, UTF-8 PASS.

### CI / release V57

Main CI chạy source regression **V26-V57** và browser E2E thêm `booking-seat-intelligence-v57.spec.ts`. Build/Maven/Playwright vẫn để GitHub Actions chạy trên disposable stack.

Release candidate mặc định:

```text
v57.0.0-rc.1
```

Stable:

```text
v57.0.0
```

Nếu RC1 đã trỏ tới commit khác, tăng `rc_number` lên 2, 3, ...; không force-update RC cũ.

## V58 - Operations Control Center

V58 bám đúng roadmap **Operations Control Center** và đưa các tín hiệu vận hành phân tán về một control surface cho Manager/Admin. Bản này tái sử dụng dữ liệu thật từ các module đã có; không thêm bảng mới và không tự động mutate payment, booking, maintenance, support, inventory hay incident.

### Phạm vi V58

- **Payment:** payment `REVIEW` và `FAILED` trong 60 phút gần nhất.
- **Booking:** booking `PENDING`, booking đã quá `expires_at` và booking sẽ hết hạn trong 5 phút.
- **Equipment:** `OUT_OF_SERVICE`, `DEGRADED`, `MAINTENANCE` và `next_service_due` đã quá hạn.
- **Staff:** attendance đang `WORKING`, ca được xếp trong ngày và ca đang diễn ra nhưng chưa có check-in.
- **Support:** case đang mở và case đã quá SLA.
- **Inventory:** branch inventory tồn thấp / hết tồn khả dụng theo V48.
- **Incident:** incident đang mở và incident `CRITICAL`.
- **Cảnh báo tập trung:** chỉ sinh alert khi count thực tế > 0, sắp xếp `CRITICAL -> HIGH -> MEDIUM -> LOW`.
- **Near-realtime:** frontend dùng **5-second server snapshot polling** và hiển thị rõ cơ chế này; V58 **không giả vờ là WebSocket** cho những domain chưa có event stream thống nhất.
- **RBAC:** Admin xem toàn hệ thống hoặc từng rạp; Manager bị khóa đúng cinema scope đang được gán.

### Database / migration V58

**V58 không tạo migration Flyway mới.** Migration cao nhất vẫn là:

```text
V52__pwa_mobile_experience_3.sql
```

Schema contract giữ nguyên:

```text
56 application tables
+ flyway_schema_history
= 57 public tables
```

### API / contract V58

```text
GET /api/admin/operations-control/cinemas
GET /api/admin/operations-control/snapshot?cinemaId={uuid}
```

Snapshot trả `pollAfterSeconds`, `overallStatus`, 7 `domains`, danh sách `alerts` và các metric chi tiết. Endpoint chỉ đọc và được bảo vệ cho `MANAGER`/`ADMIN`.

### Test source V58

```powershell
python .\tools\verify_v53_operations_command_center.py
python .\tools\verify_v57_booking_seat_intelligence.py
python .\tools\verify_v58_operations_control_center.py
python .\tools\verify_seed_demo_57.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v58.ps1
```

Kỳ vọng gate mới:

```text
V58 verification: 80/80 checks passed
```

### Test bảng V58

V58 không đổi schema nên tiếp tục:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\check-demo-57-table-counts.ps1
powershell -ExecutionPolicy Bypass -File .\tools\check-v51-data-utf8.ps1
```

Kỳ vọng: `57 public tables`, Flyway latest `V52`, UTF-8 PASS.

### CI / release V58

Main CI chạy source regression **V26-V58** và browser E2E thêm `operations-control-center-v58.spec.ts`. Build/Maven/Playwright vẫn để GitHub Actions chạy trên disposable stack.

Release candidate mặc định:

```text
v58.0.0-rc.1
```

Stable:

```text
v58.0.0
```

Nếu RC1 đã trỏ tới commit khác, tăng `rc_number` lên 2, 3, ...; không force-update RC cũ.



## V58 data quality - realistic 57-table reference and test data

CineBooking giữ **dữ liệu demo/reference và dữ liệu do smoke/E2E tạo ra ở dạng realistic fictional identities**: tên, mô tả nghiệp vụ, thiết bị, ca làm, support case và giao dịch nhìn giống dữ liệu vận hành thật nhưng **không dùng thông tin cá nhân của người thật**. Test customer dùng địa chỉ `example.com` có gắn suffix duy nhất; đây là miền dành cho tài liệu/test và không trỏ tới hộp thư cá nhân thật.

Bản V58 data-quality hardening tách rõ hai nhóm account reference:

```text
10 staff/manager accounts -> staff_profile, shift, attendance, maintenance, incident
10 USER customer accounts  -> booking, payment, loyalty, favorite/review, support, security, PWA
```

Điều này sửa semantic mismatch cũ khi một số reference booking/customer rows từng dùng staff account làm chủ sở hữu. Các browser/integration/smoke journey cũng không còn lưu tên kiểu `V40 Loyalty Customer`, `V42 Finance Customer`, `V10 Test Staff Updated`, `Playwright`, `E2E` hoặc email `@example.test` vào database.

### Làm sạch database hiện có

Trên database local đã từng chạy các test cũ, chạy theo thứ tự:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\seed-reference-57-tables.ps1
powershell -ExecutionPolicy Bypass -File .\tools\repair-realistic-data-57-tables.ps1
powershell -ExecutionPolicy Bypass -File .\tools\audit-realistic-data-57-tables.ps1
```

`repair-realistic-data-57-tables.ps1` **không xóa lịch sử test/audit**: giữ nguyên ID, quan hệ, timestamp và event; chỉ chuẩn hóa các display value đã biết và relink legacy support/reference customer data khi cần. `audit-realistic-data-57-tables.ps1` kiểm tra đủ **57 public tables**, quét text/varchar để phát hiện synthetic human-readable marker và kiểm tra booking/support/staff ownership theo role.

Source gate:

```powershell
python .\tools\verify_seed_demo_57.py
python .\tools\verify_reference_data_57.py
python .\tools\verify_realistic_data_57.py
```
