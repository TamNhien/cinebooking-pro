# CineBooking Pro V45

CineBooking Pro là hệ thống đặt vé rạp phim full-stack gồm customer booking, payment, QR ticket/check-in, PWA offline ticket, loyalty/voucher, staff operations, analytics, inventory, waitlist, showtime planning, cinema operations và secure ticket transfer.

> **Current release:** V45 — Customer Support & Service Recovery 2.0  
> **Backend:** Spring Boot 4.1 / Java 25 / PostgreSQL 18.4 / Redis 8.8  
> **Frontend:** Next.js 16.3 / Node.js 24 / Playwright Chromium  
> **Runtime:** Docker Compose + nginx load balancing 2 backend replicas

This repository intentionally keeps **all project documentation in this single `README.md`**.

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

### V42.1 - Analytics Export + CI/Release Wiring + Documentation Sync

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

### V43 - Staff Operations 2.0

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

### V44 - Cinema Maintenance & Asset Reliability 2.0

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

### V45 - Customer Support & Service Recovery 2.0

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
V36       Secure ticket transfer
V37       Payment gateway hardening
V38       Refund/cancellation automation
V40       Loyalty & Membership 2.0
V41       Notification engagement 2.0
V42       Financial ledger & reconciliation
```

V42.1 không có migration mới. Flyway latest version phải là:

```text
42
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
.github/workflows/       CI + Release Candidate + Stable GitHub Release
docker-compose.yml       local/full-stack orchestration
README.md                toàn bộ tài liệu dự án
```

---

## 24. Current release status

Source target:

```text
CineBooking Pro V45
```

Release target:

```text
v45.0.0
```

V45 có migration `V45__customer_support_service_recovery.sql`; Flyway latest là V45.

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

## Demo seed — UTF-8-safe sample data for all 47 pgAdmin tables

The V45 schema now contains **47 pgAdmin tables**: 46 application tables plus `flyway_schema_history`. The previous seed already covered the V44-era tables but did not seed the two V45 support tables. The current seed therefore adds ten deterministic rows to both `customer_support_case` and `customer_support_case_event` and validates that no table is left empty.

`movie` is deliberately not populated with synthetic `Phim Demo` rows. All seeded movie relations reuse the eight canonical V29 films already present in the database. `flyway_schema_history` is never inserted, updated or deleted; its genuine Flyway migration rows satisfy the table-data check. `financial_ledger_line` intentionally receives twenty rows (balanced debit/credit lines for ten ledger entries).

The UTF-8-safe runner copies SQL byte-for-byte into the PostgreSQL container and executes `psql -f`, avoiding Windows PowerShell code-page conversion. It also repairs earlier DEMO45 Vietnamese text such as `Máy chiếu`, `Phòng`, support subjects/messages and other human-readable fields.

Run from the repository root on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\seed-demo-47-tables.ps1
```

The former command remains as a compatibility alias:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\seed-demo-45-tables.ps1
```

Static verification:

```powershell
python .\tools\verify_seed_demo_47.py
```

Inspect exact row counts for all 47 tables:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\check-demo-47-table-counts.ps1
```

The seed aborts if PostgreSQL is not UTF-8, if a checked DEMO45 text value still contains `?`, if the eight canonical movies are unavailable, if synthetic `Phim Demo` rows remain, or if any of the 47 pgAdmin tables is still empty after seeding. Demo accounts remain `demo45.user01@cinebooking.local` through `demo45.user10@cinebooking.local`, password `Demo@123`.
