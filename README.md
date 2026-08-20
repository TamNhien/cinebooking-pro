# CineBooking Pro V40

CineBooking Pro là hệ thống đặt vé rạp phim full-stack gồm customer booking, payment, QR ticket/check-in, PWA offline ticket, loyalty/voucher, staff operations, analytics, inventory, waitlist, showtime planning, cinema operations và secure ticket transfer.

> **Current release:** V40 — Loyalty & Membership 2.0  
> **Backend:** Spring Boot 4.1 / Java 25 / PostgreSQL 18.4 / Redis 8.8  
> **Frontend:** Next.js 16.3 / Node.js 24 / Playwright Chromium  
> **Runtime:** Docker Compose + nginx load balancing 2 backend replicas

This repository intentionally keeps **all project documentation in this single `README.md`**.

---

## 1. V36 — Secure Ticket Transfer

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

## 2. V34 — Bảo trì & khóa phòng chiếu

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

## 2. Các chức năng chính

### Khách hàng

- Đăng ký / đăng nhập / refresh session / logout.
- Quản lý hồ sơ và các phiên đăng nhập.
- Danh sách phim, tìm kiếm, lọc thể loại/ngôn ngữ/phân loại tuổi.
- Sắp xếp phim theo nhiều tiêu chí.
- Chi tiết phim, trailer, đánh giá, yêu thích.
- Gợi ý phim cá nhân hóa và trending.
- Duyệt lịch chiếu theo tháng/ngày.
- Quick Booking.
- Chọn ghế realtime với Redis hold + WebSocket.
- Giá vé động.
- Bắp nước/concession và inventory-aware checkout.
- Voucher và loyalty points.
- Thanh toán mock/VNPay/MoMo integration structure.
- QR e-ticket.
- Vé offline/PWA.
- Ví vé `/bookings` với lọc/tìm kiếm/trạng thái.
- Tải lịch `.ics` cho Google Calendar / Apple Calendar / Outlook.
- Sao chép booking code và in vé.
- Yêu cầu hoàn vé.
- Notification center và notification preferences.
- Showtime reminder.
- Sold-out waitlist `/waitlist` và thông báo khi ghế được mở lại.
- **V36 chuyển/tặng vé** với QR rotation và invalidation QR cũ.

### Staff / Manager

- QR check-in / staff gate.
- Lịch sử check-in.
- Nhân viên theo rạp.
- Xếp ca.
- Check-in/check-out ca làm.
- Chấm công, đi trễ, về sớm, vắng ca.
- Xin nghỉ / duyệt nghỉ.
- Timesheet.

### Admin

- Quản lý phim, rạp, phòng, ghế, suất chiếu, user.
- Seat layout editor.
- Booking operations.
- Refund operations.
- Commerce / voucher / concession.
- Inventory và stock movement.
- Dynamic pricing.
- Review moderation.
- Audit log.
- Revenue / occupancy / seat heatmap / hourly demand / staff analytics.
- **V33 Showtime Planner & Conflict Guard**.
- **V34 Auditorium Maintenance & Blackout Windows**.
- **V36 Secure Ticket Transfer**.

---

## 3. V33 — Showtime Planner & Conflict Guard

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

## 4. V32 — Sold-out Waitlist & Seat Alerts

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

## 5. V31 — Ticket Wallet & Calendar

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

## PWA V26 compatibility note

V26 has no schema migration. PWA/offline-ticket changes are frontend/service-worker features and preserve the existing database schema.

## 6. V30 — Movie Discovery & Showtime Calendar

- bộ lọc phim nâng cao;
- sort phim;
- calendar theo tháng/ngày;
- chi tiết phim chỉ hiện showtime ngày đang chọn;
- hỗ trợ catalog/lịch demo đến 30/09/2026.

---

## 7. Demo catalog & lịch chiếu

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

## 8. Kiến trúc

```text
Browser / PWA
      |
    nginx
   /     \
backend-1 backend-2
   |         |
   +---- PostgreSQL 18.4
   +---- Redis 8.8
```

Docker Compose services:

```text
postgres
redis
backend-1
backend-2
frontend
nginx
```

Optional observability profile có Prometheus/Grafana nếu cấu hình tương ứng.

Frontend internal port:

```text
3000
```

Backend internal port:

```text
8080
```

Default public HTTP port:

```text
80
```

Có thể đổi bằng:

```text
HTTP_PORT
```

---

## 9. Yêu cầu môi trường

Khuyến nghị:

```text
Docker Desktop / Docker Engine + Compose
Java 25 nếu chạy backend ngoài Docker
Node.js 24 nếu chạy frontend ngoài Docker
Python 3 để chạy source verifiers
Windows PowerShell 5.1+ cho diagnostic/backup scripts trên Windows
```

Kiểm tra:

```powershell
docker version
docker compose version
java -version
node --version
python --version
```

---

## 10. Environment variables

Tạo file local `.env` từ `.env.example`.

**Không commit `.env` thật.**

Tạo secret local bằng helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\init-env.ps1
```

JWT secret phải đủ mạnh và backend fail-fast nếu secret thiếu/placeholder/quá ngắn.

Kiểm tra file nhạy cảm không bị Git track:

```powershell
git ls-files .env "backups/*.dump" "backups/*.dump.sha256"
```

Lệnh trên phải không trả về gì.

---

## 11. Chạy hệ thống local

```powershell
docker compose up -d --build
docker compose ps
```

Mở:

```text
http://localhost
```

Xem log:

```powershell
docker compose logs --tail=200 backend-1
docker compose logs --tail=200 backend-2
docker compose logs --tail=100 frontend
docker compose logs --tail=100 nginx
```

### Cập nhật source bình thường

```powershell
docker compose up -d --build
```

**Do not use `docker compose down -v` for normal updates.**  
Lệnh đó xóa volume và có thể xóa database local.

Makefile target `reset` bị khóa chủ động để bảo vệ dữ liệu.

---

## 12. Database migrations

Flyway chạy khi backend startup.

Các mốc schema quan trọng:

```text
V1..V25   Core product/platform features
V29       Demo catalog + September 2026 schedule
V32       Showtime waitlist
V34       Auditorium maintenance blackout windows
```

Sau V34, Flyway latest version phải là:

```text
34
```

Không sửa nội dung migration cũ đã được áp dụng. Luôn tạo migration mới.

---

## 13. Backup / verify / restore PostgreSQL

Backup được lưu dưới:

```text
./backups
```

Compose mount:

```text
./backups:/backups
```

### Tạo backup

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\backup-db.ps1
```

Backup dùng PostgreSQL custom archive và tạo SHA-256 sidecar.

### Verify backup

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\verify-db-backup.ps1 -BackupPath .\backups\<file>.dump
```

Verify gồm SHA-256 và `pg_restore --list`.

### Test restore an toàn

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-v27.ps1
```

Test chỉ restore vào temporary database và không drop production/local main DB.

### Restore thật

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\restore-db.ps1 -BackupPath .\backups\<file>.dump -ConfirmRestore
```

Restore flow:

1. verify archive;
2. tạo safety backup;
3. stop `backend-1` và `backend-2`;
4. recreate DB sạch từ `template0`;
5. `pg_restore --exit-on-error`;
6. rollback tự động nếu restore thất bại khi có thể.

**Do not run `docker compose down -v` as a backup/restore shortcut.**

---

## 14. Frontend toolchain policy

Toolchain được giữ trong vùng đã tương thích với Next.js hiện tại:

- ESLint 9.x;
- TypeScript 5.x;
- `@playwright/test` pin exact trong dòng được dự án kiểm chứng.

Dependabot vẫn cập nhật patch/minor phù hợp nhưng không tự động đưa các major chưa tương thích vào CI.

Lint:

```powershell
cd frontend
npm install
npm run lint
```

Production build:

```powershell
npm run build
```

---

## 15. Playwright E2E

Browser E2E chạy Chromium qua nginx/full stack.

Các journey chính:

```text
register
→ login
→ quick booking
→ seat hold
→ mock payment
→ CONFIRMED ticket
→ calendar / ticket wallet
→ QR
→ staff/admin gate check-in
```

Ngoài ra có E2E cho:

- movie discovery + September calendar;
- V33 showtime conflict preview;
- V34 maintenance blackout → planner conflict → cleanup.

Chạy khi stack E2E đã sẵn sàng:

```powershell
cd frontend
npm run e2e
```

Playwright CI timezone:

```text
Asia/Ho_Chi_Minh
```

để `datetime-local` deterministic trên GitHub runner.

---

## 16. High-Traffic Booking protections

High-Traffic Booking bao gồm:

- booking idempotency key;
- request fingerprint SHA-256;
- duplicate/retry replay;
- seat ownership uniqueness;
- contention handling;
- HTTP 409 cho seat race;
- load-test scripts cho idempotency và contention.

Mục tiêu là không tạo booking trùng khi client retry hoặc nhiều request cạnh tranh cùng ghế.

---

## 17. Source verifiers

Verifier V34:

```powershell
python .\tools\verify_v34_auditorium_blackouts.py
```

Diagnostic full chain:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v34.ps1
```

Các verifier quan trọng vẫn được giữ để bắt regression của security, DB safety, CI, Playwright, demo schedule, discovery, ticket wallet, RC determinism, waitlist và showtime planner.

---

## 18. GitHub CI

Workflow chính:

```text
.github/workflows/ci.yml
```

Các gate chính:

- backend unit tests;
- backend Testcontainers integration;
- PostgreSQL + Redis real containers;
- Flyway latest-version assertion;
- frontend lint;
- frontend production build;
- V26→V34 source regression checks;
- Docker Compose config validation;
- backend/frontend Docker image builds;
- test/build artifacts.

CI không deploy production.

---

## 19. Release Candidate

Workflow:

```text
.github/workflows/release-candidate.yml
```

Workflow là **manual-only** và không publish/deploy.

Sau khi main CI xanh:

```text
GitHub
→ Actions
→ CineBooking Release Candidate
→ Run workflow
→ branch: main
→ version: v35.0.0-rc.1
```

RC chạy:

- full disposable Docker stack;
- nginx/frontend/API smoke;
- cả hai backend replicas phải sống;
- Playwright Chromium journeys;
- release-candidate manifest artifact;
- cleanup chỉ trên disposable Compose project/volumes.

Không dùng production credentials trong RC.

---

## 20. V34 validation checklist

Sau khi update source:

```powershell
python .\tools\verify_v34_auditorium_blackouts.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v34.ps1
docker compose up -d --build
docker compose ps
```

Kiểm tra migration:

```powershell
docker compose logs --tail=200 backend-1
docker compose logs --tail=200 backend-2
```

Tìm migration version 34 và đảm bảo cả backend đều `Up`.

Manual functional test:

1. login Admin;
2. mở `/admin/maintenance`;
3. chọn một phòng không có showtime ở khoảng test;
4. tạo blackout;
5. mở `/admin/showtimes`;
6. preview một showtime trùng blackout;
7. xác nhận preview báo `Bảo trì` và `creatable = 0`;
8. quay lại maintenance và mở phòng.

---

## 21. Commit an toàn

```powershell
git ls-files .env "backups/*.dump" "backups/*.dump.sha256"
git add -A
git status --short
git commit -m "Add V34 auditorium maintenance and blackout guard"
git push
```

`git ls-files` phải không hiển thị `.env` hoặc database dump.

---

## 22. Security / production notes

- Không commit JWT secret thật.
- Không commit SMTP/payment credentials.
- Không commit `.env`.
- Không commit database dump.
- Không dùng demo admin password ở production.
- Không expose PostgreSQL/Redis trực tiếp ra Internet.
- Dùng HTTPS ở reverse proxy/load balancer production.
- Backup DB trước migration lớn.
- Kiểm tra CI + RC trước release.
- Release Candidate workflow hiện không publish image và không deploy production.

---

## 23. Project structure

```text
backend/                 Spring Boot backend
frontend/                Next.js frontend + Playwright
nginx/                   reverse proxy/load balancer
loadtest/                k6 scenarios
tools/                   diagnostics, verifiers, backup/restore, E2E scripts
backups/.gitkeep         safe local backup directory placeholder
.github/workflows/       CI + manual Release Candidate
docker-compose.yml       local/full-stack orchestration
README.md                toàn bộ tài liệu dự án
```

---

## 24. Current release status

Source target:

```text
CineBooking Pro V36
```

Release-candidate label:

```text
v36.0.0-rc.1
```

Runtime success chỉ được coi là xác nhận cuối khi GitHub CI và Release Candidate E2E chạy xanh trên clean runner.

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

## V36 verification & release

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

