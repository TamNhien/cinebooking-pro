# CineBooking Pro V36

CineBooking Pro là hệ thống đặt vé rạp phim full-stack gồm customer booking, payment, QR ticket/check-in, PWA offline ticket, loyalty/voucher, staff operations, analytics, inventory, waitlist, showtime planning, cinema operations và secure ticket transfer.

> **Current release:** V36 — Secure Ticket Transfer  
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
