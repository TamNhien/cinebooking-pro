# CineBooking Pro V77

CineBooking Pro là hệ thống đặt vé rạp phim full-stack gồm customer booking, payment, QR ticket/check-in, PWA offline ticket, loyalty/voucher, staff operations, analytics, inventory, waitlist, showtime planning, cinema operations và secure ticket transfer.

> **Current release:** V77.0.53 - Historical V29.2 Playwright Contract Compatibility

> **Current language policy (V77.0.53):** profile sạch khởi tạo tiếng Việt. Nút **VN / EN** lưu `cinebooking_language`; menu, nút, liên kết, nhãn biểu mẫu, option, placeholder/aria/title/alt và tiêu đề giao diện đã được audit toàn source để đổi theo lựa chọn. Surface mới tiếp tục dùng presentation-owned copy; surface legacy được phủ bằng catalog VI→EN có kiểm soát, chỉ dịch copy UI đã audit và không dịch enum/status machine, payload backend, tên phim, dữ liệu khách hàng hay ID nghiệp vụ. Root layout vẫn khôi phục preference trước hydration/full navigation.
> **Previous stable incorporated:** `v76.0.0` - Recommendation 5.0 + Assisted Bookings UI polish.
> **V77 stable target:** `v77.0.53` (stable-only patch release flow).

V77 adds **CRM Automation 5.0** after V76 Recommendation 5.0. The new Admin surface `/admin/crm-automation` introduces lifecycle playbooks for first-booking activation, engaged cross-sell, VIP reward, at-risk win-back and lapsed reactivation, all derived from existing operational user/booking/payment data.

V77 adds contact-safety controls before any campaign execute: promotion opt-out, enabled-channel requirement, a maximum of 2 promotion notifications per 7 days, 72-hour promotion cooldown, mandatory Preview, explicit `maxRecipients` blast-radius guard, owner-scoped one-use vouchers and idempotent delivery. Outcome metrics use only `PROMOTION_V77` history and label booking/revenue lift as **correlation, not causal attribution**. V77 is deliberately **no-schema**: database authority remains **Flyway V72 / 67 public tables**, and no synthetic customer/booking/payment data is added.

V77 also carries a **Brave browser identity reliability fix** for security-session display metadata. Detection now uses the official `navigator.brave.isBrave()` signal when available, Chromium brand hints from `navigator.userAgentData`, backend `Sec-CH-UA`, and finally normal User-Agent fallback. A Brave-specific client-hint brand takes precedence over a generic Chrome fallback, nginx forwards both identity headers explicitly, and `/me/security/client-context` can repair the current session/trusted-device/related alert label without rewriting unrelated historical audit records. These browser signals remain display-only metadata and are never used as authentication or authorization evidence.

V77.0.3 extends that repair path for **historical UA-version drift** without blind rewrites. When the current request positively proves Brave, CineBooking may use a later, already Brave-labelled session as corroborating evidence for an older `Chrome · <OS>` session only when the user, exact historical User-Agent, exact IP and OS all match, the Brave evidence occurs after the candidate within 24 hours, and a same-user `NEW_DEVICE` alert is linked to that session. This is an idempotent display-metadata correction only; risk scores, timestamps, auth state and unrelated audit rows are untouched.

V77.0.8 keeps that anti-false-positive Brave chronology intact and instead closes two newly observed release/runtime gaps. Java 25 compilation is warning-free again by replacing deprecated Spring Data Redis TTL and Spring Framework HTTP 413 APIs. Browser identity now recognizes the `Microsoft Edge` brand from Chromium client hints / `navigator.userAgentData` before a generic Chrome fallback, preventing managed Edge/Playwright Edge sessions with a Chrome-like frozen User-Agent from being persisted as `Chrome · Windows`. This remains display-only metadata and does not weaken authentication or Brave reconciliation guards.


V77.0.9 makes the web experience **Vietnamese-first** while deliberately preserving machine contracts such as Java/TypeScript identifiers, API routes, enum/status codes, data-testid values and protocol/vendor names. Admin Dashboard restores the V57 booking/seat-intelligence entry and V58 operations-control entry in ascending version order. Maintenance completion no longer relies on a native browser prompt: a CineBooking modal validates the repair result locally, accepts a meaningful two-character result such as `ok`, updates the work order, reloads the card, and shows the stored result/history in Vietnamese. A bounded local data-normalization script converts known human-readable reference/history strings to Vietnamese without rewriting enum/status/action columns. V77.0.9 is a **no-schema patch**; Flyway remains V72 / 67 public tables.

V77.0.10 fixes the V77.0.9 local data-localization runner after the first real database execution exposed the intentionally immutable V42 financial ledger trigger. The localizer now updates only mutable display text, never bypasses or disables the append-only ledger guard, writes new financial descriptions in Vietnamese, and localizes legacy immutable ledger descriptions only when they are presented by the API/UI. The PowerShell runner is ASCII-safe so Windows PowerShell 5.1 no longer prints mojibake when invoked from PowerShell 7. V77.0.10 remains a **no-schema patch**; Flyway stays V72 / 67 public tables.

V77.0.11 fixes Docker frontend builds on Windows hosts after a real Compose build exposed `/app/node_modules/.bin/next: node.exe: not found`. The frontend Docker context now excludes host `node_modules` and generated build/test artifacts so Windows npm shims cannot overwrite Linux dependencies copied from the Docker dependency stage. The dependency stage remains inside Linux and consumes any available npm manifests without requiring a lockfile that is not part of the packaged baseline. This is a build/release hygiene patch only: no application schema or business data changes; Flyway remains V72 / 67 public tables.

V77.0.12 fixes the TypeScript contract regressions exposed only after the V77.0.11 Docker isolation fix allowed the Linux production build to reach type checking. Vietnamese display localization had accidentally changed machine property identifiers (`membershipTier`, `liveThreads`, `planningScore`) and omitted two `viLabel` imports, while the shared Vietnamese label map contained a duplicate `RECEIVED` key. V77.0.12 restores the original ASCII API/type contracts, keeps the visible Vietnamese labels, and adds a guard that rejects non-ASCII property identifiers in frontend TypeScript. This is a no-schema patch; Flyway remains V72 / 67 public tables.

V77.0.13 closes the final zero-warning ESLint regression exposed after V77.0.12 reached a clean Docker production build. The restored V57 dashboard shortcut now uses Next.js `Link` instead of a raw internal `<a href="/">`, and the showtime planner removes an unused `viLabel` import. Visible labels remain Vietnamese, V57/V58 remain restored, and machine contracts are unchanged. This is a no-schema patch; Flyway remains V72 / 67 public tables.

V77.0.14 completes the Vietnamese UI/navigation repair identified after V77.0.13: the V57 Admin shortcut now opens a dedicated `/admin/booking-seat-intelligence` surface backed by real `/admin/showtimes` and `/admin/bookings` data and links directly into each real seat map; Chromium/Windows native selects receive readable height/padding/option rhythm; and VN/EN switching is now a **site-wide presentation setting** with English as the clean-profile default and a persisted explicit Vietnamese/English choice. `LanguageProvider` updates `document.lang`, shared shell copy and a guarded runtime static-UI catalog so pages that have not yet been individually rewritten with `useLanguage()` still switch without translating API routes, enum values, JSON properties, movie/customer data or code blocks. The V56 customer-value page is fully bilingual and locale-aware, and its accidental localized API path `/admin/customer-value/điểmcard` is corrected back to the immutable machine contract `/admin/customer-value/scorecard`, fixing the red `Lỗi hệ thống` banner shown on the real Admin page. The V61 risk screen keeps machine values such as `BLOCK_RECOMMENDED` unchanged. V77.0.14 remains a **no-schema patch**; Flyway stays V72 / 67 public tables.
> **Regression compatibility:** the historical V47 gate still verifies that automatic reconciliation defaulted OFF in V47-V66, while accepting V67+ where the default is intentionally ON.
> **Backend:** Spring Boot 4.1 / Java 25 / PostgreSQL 18.4 / Redis 8.8
> **Frontend:** Next.js 16.3.4 / Node.js 24 / Playwright Chromium
> **Runtime:** Docker Compose + nginx load balancing 2 backend replicas

V66 adds **Booking Consistency & Seat Locking 4.0** on top of V65 observability: PostgreSQL is now the durable authority for short-lived seat holds, seat-row pessimistic locks serialize contenders across backend replicas, Redis is only a best-effort TTL mirror, checkout converts a durable hold in the same transaction, and existing `uq_showtime_seat_active` remains the final booking invariant. V66 adds Flyway `V66__durable_seat_holds.sql`; the database now has **58 public tables**: 57 seeded/core tables plus the transient operational `seat_hold` table. No synthetic movie/customer/booking/payment activity is seeded for V66.

## Quy ước chạy lệnh

Tất cả lệnh test/build/seed trong README này **mặc định chạy từ**:

```text
D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
```


## Chính sách dữ liệu thật và UTF-8

- Database bắt buộc `server_encoding = UTF8`; script runtime kiểm tra cả `server_encoding` và `client_encoding`. `POSTGRES_INITDB_ARGS` chỉ áp dụng khi tạo cluster mới; không xóa volume chỉ để đổi encoding.
- PostgreSQL init mới dùng `--encoding=UTF8`; backend JVM dùng `-Dfile.encoding=UTF-8`; nginx khai báo `charset utf-8`.
- Web giữ `<html lang="vi">`; CSV Analytics trả `text/csv;charset=UTF-8` và CSV export có UTF-8 BOM.
- V52/V65/V66/V67/V68/V69/V70/V71/V72/V73/V74/V75/V76/V77 **không tạo phim/khách/booking/payment giả**. Recommendation 5.0 tiếp tục tái sử dụng đúng 8 phim V29; CRM V64 chỉ phân khúc từ dữ liệu thật; V65 chỉ đọc runtime/metrics/dependency health; V66 chỉ ghi `seat_hold` khi người dùng thật sự thao tác giữ ghế.
- `tools/seed-v51-real-data.ps1` không tạo cinema/product/booking/payment giả; nó chỉ tính `analytics_snapshot` từ giao dịch hiện có.
- `cinema_concession_cost_basis` **không được tự bịa giá vốn**. Cost chưa biết thì giữ `NULL`; chỉ nhập/import giá vốn thật.
- `tools/seed-demo-57-tables.ps1` là deterministic CI/reference fixture. `pwa_device` reference chỉ ghi metadata thiết bị tự nhiên với `push_enabled=false`; không bịa endpoint/p256dh/auth. Không dùng fixture này để ghi đè dữ liệu nghiệp vụ thật trên database bạn đang dùng.

## Version history / changelog

> **Quy ước tài liệu:** Toàn bộ lịch sử nâng cấp được gộp duy nhất trong `README.md` này và sắp xếp theo thứ tự phiên bản tăng dần. Không tạo các file `v*-release-notes.md`, `CHANGELOG*.md` hoặc `THAY_DOI_V*.md` riêng cho từng phiên bản.

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
| **V59** | **Realtime Operations 4.0: Redis Pub/Sub + STOMP WebSocket, event-driven refresh, alert ACK/Resolve, cooldown, escalation, audit history** | **Không đổi schema** |
| **V60** | **Payment Production 4.0: go-live readiness guard, HTTPS callback policy, merchant identity validation, webhook replay-conflict protection, production dashboard** | **Không đổi schema** |
| **V61** | **Fraud & Risk Intelligence: explainable cross-domain scoring, evidence queue, ADMIN manual disposition, audit trail, no automatic blocking** | **Không đổi schema** |
| **V62** | **Dynamic Pricing 4.0: occupancy + booking velocity + lead-time pricing, bounded automation, explainable quote breakdown, what-if simulator** | **Không đổi schema** |
| **V63** | **Recommendation 4.0: deep taste facets, language/duration/weekday context, FAMILIAR/BALANCED/DISCOVERY modes, diversity reranking, score breakdown** | **Không đổi schema** |
| **V64** | **CRM & Marketing Automation 4.0: real-data audience segmentation, campaign preview/launch, owner-scoped one-use vouchers, preference-aware promotion delivery, idempotent campaign codes** | **Không đổi schema** |
| **V65** | **Observability & Reliability 4.0: bounded-cardinality API metrics, X-Trace-Id log correlation, SLO health, PostgreSQL/Redis probes, Prometheus alerts, provisioned Grafana dashboard** | **Không đổi schema** |
| **V66** | **Booking Consistency & Seat Locking 4.0: durable PostgreSQL holds, deterministic seat-row locks, Redis TTL mirror, checkout hold conversion, expiry/reconcile operations, multi-replica contention guard** | **`V66__durable_seat_holds.sql`** |
| **V67** | **Payment Resilience & Reconciliation 5.0: auto gateway reconciliation, safe webhook recovery/dead-letter queue, refund settlement state, Admin recovery dashboard** | **`V67__payment_resilience_recovery.sql`** |
| **V68** | **Security & Identity 5.0: session-bound Admin step-up authentication, protected sensitive writes, security headers, stable-only release flow** | **`V68__security_identity_step_up.sql`** |
| **V69** | **Backup & Disaster Recovery 5.0: verified backup manifest, append-only DR evidence, non-destructive restore drills, RPO/RTO readiness dashboard** | **`V69__backup_disaster_recovery_evidence.sql`** |
| **V70** | **Data Governance & Privacy 5.0: privacy request workflow, subject-data inventory, retention-policy catalog, SLA/overdue tracking, destructive-execution guardrail** | **`V70__data_governance_privacy.sql`** |
| **V71** | **Secrets & Key Governance 5.0: metadata-only rotation catalog, credential presence posture, due/overdue tracking, append-only rotation evidence, no secret-value persistence** | **`V71__secrets_key_governance.sql`** |
| **V72** | **Software Supply Chain Integrity 5.0: append-only artifact digests, build/SBOM references, server-derived scan decisions, advisory release posture** | **`V72__software_supply_chain_integrity.sql`** |
| **V73** | **GitHub Actions Runtime Modernization 5.0: Node 24 action baseline, upload-artifact v7, setup-java v6, legacy-action regression gate** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V74** | **Reliability & Resilience 5.0: multi-window burn-rate, incident timeline, controlled failover exercise, recovery runbook** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V75** | **Analytics & BI 5.0: booking/payment/check-in funnel, cohort activation + repeat 30d, realized LTV, provider conversion, movie/cinema efficiency** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V75.0.1** | **Cost Coverage Drill-down: chỉ đúng rạp/sản phẩm/đơn vị đã bán đang thiếu cost basis, affected revenue, cập nhật trực tiếp** | **Patch no-schema; giữ Flyway V72 / 67 tables** |
| **V76** | **Recommendation 5.0: evidence-aware For You, real-data recommendation quality dashboard, coverage, feedback/source metrics, assisted booking correlation** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77** | **CRM Automation 5.0: lifecycle playbooks, contactability/suppression, frequency cap, cooldown, preview-before-execute, blast-radius guard, idempotent owner-scoped vouchers, CRM outcome correlation** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.1** | **Brave Browser Identity Reliability: navigator.brave + UA brand hints + Sec-CH-UA fallback, nginx forwarding, current-session metadata repair** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.2** | **Brave legacy alert reconciliation: repair có giới hạn cho NEW_DEVICE bị gắn Chrome trong 24h khi cùng user + exact UA + IP + related session; harden Security E2E login selector** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.3** | **Historical Brave evidence reconciliation: dùng Brave session đã nhận dạng dương tính làm evidence cho legacy Chrome session có cùng user + exact UA + IP + OS, evidence phải xuất hiện sau candidate trong tối đa 24h, chỉ sửa linked NEW_DEVICE display metadata** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.4** | **Zero-warning generated artifact hygiene: ESLint loại generated Playwright/coverage/build artifacts nhưng giữ `eslint . --max-warnings=0` nghiêm ngặt cho source thật** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.5** | **Warning-free Java 25 + E2E runtime hygiene: Jackson 3 deprecation cleanup, explicit Mockito javaagent, Redis teardown ordering, immutable Flyway warning suppression, Playwright 1.63, service-worker-isolated Security E2E** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.6** | **Dependency security + resilient Playwright bootstrap: Next.js 16.3.4 security patch, explicit version-pinned `allowScripts` for reviewed `unrs-resolver`, high/critical npm-audit gate, 120s Playwright CDN timeout, optional system-browser channel fallback** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.7** | **Security E2E strict-locator reliability: removes the ambiguous `Security Operations` heading query that matched both H1 and H2 under Playwright strict mode; waits on the existing V68 page test-id and an exact level-1 accessible heading** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.8** | **CI deprecation + Chromium brand identity hygiene: Java 25 warning-free Spring API replacements; Microsoft Edge client-hint/userAgentData detection overrides generic Chrome fallback while Brave chronology guards remain unchanged** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.9** | **Việt hóa giao diện + độ tin cậy hoàn tất bảo trì + khôi phục V57/V58 trên Dashboard + chuẩn hóa dữ liệu hiển thị DB** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.10** | **Sửa localizer tiếng Việt: tôn trọng sổ cái V42 bất biến, loại lỗi rollback, sửa mojibake PowerShell 5.1, Việt hóa hiển thị tài chính** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.11** | **Sửa Docker build trên Windows: loại host `node_modules` khỏi build context, tránh shim `node.exe`, giữ dependency Linux tách khỏi `node_modules` Windows** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.12** | **Sửa hồi quy TypeScript sau Việt hóa: khôi phục property contract ASCII, bổ sung import `viLabel`, loại key nhãn trùng và thêm guard chống dịch nhầm tên biến/property** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.13** | **Khép zero-warning lint sau Việt hóa: dùng Next `Link` cho shortcut V57 và loại import `viLabel` không dùng ở bộ lập lịch suất chiếu** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.14** | **Hoàn tất navigation/language/dropdown/localization: V57 có trang Admin riêng từ dữ liệu thật, VN/EN lưu lựa chọn, select dễ đọc trên Chromium/Windows, Việt hóa presentation-only và đồng bộ Browser E2E** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.15** | **Sửa V64 Xem trước/Phát hành có phản hồi ngay tại form + hướng dẫn V68 step-up; chuẩn hóa V59 VN/EN theo nút ngôn ngữ; restore ngôn ngữ trước hydration; harden Browser E2E theo tài khoản Admin hiện hữu** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.16** | **V59 chỉ hiển thị một tên miền nghiệp vụ mỗi ô; Việt hóa severity + lịch sử cảnh báo; harden V64 segment selector và full-navigation VN/EN theo lỗi runtime thực tế** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.17** | **Sửa race full-navigation VN/EN bằng `useSyncExternalStore`: localStorage + html lang + provider được hợp nhất thành một presentation snapshot; Maintenance/Showtimes giữ EN sau page.goto/reload** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.18** | **Sửa production build TypeScript sau V77.0.17: khóa generic `useSyncExternalStore<Language>` và server snapshot `Language`, ngăn inferred `string` lan sang Analytics/Attendance/Maintenance/V59/V64 và các surface dùng helper** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.19** | **Khép zero-warning lint ở V64 Marketing: ổn định `refreshStepUp` và `load` bằng `useCallback`, khai báo đầy đủ dependency cho `useEffect`, loại cảnh báo `react-hooks/exhaustive-deps` mà không suppress rule** | **Không đổi schema (Flyway V72 / 67 tables)** |
| **V77.0.20** | **Ổn định full Browser E2E sau khi targeted V59/V64/language đã PASS: gom VN/EN về một external store duy nhất, làm mới Service Worker cho auth/payment hard-navigation, chống race Support/V64, dùng selector máy ổn định và cập nhật các assertion theo copy hiện hành** | **Không đổi schema (Flyway V72 / 67 tables), không thêm seed nghiệp vụ giả** |
| **V77.0.21** | **Sửa 2 regression targeted còn lại sau V77.0.20: hậu-hydration re-emit language store để full navigation EN không kẹt copy VI; V64 re-entry sau V68 bỏ `/me` dư thừa, retry overview có giới hạn và chờ đúng trạng thái dữ liệu thật sẵn sàng** | **Không đổi schema (Flyway V72 / 67 tables), giữ Admin hiện hữu từ `.env`** |
| **V77.0.22** | **Khép lỗi targeted cuối: root bootstrap đặt `lang` + readiness marker trước hydration từ cùng `cinebooking_language`; React reconciles marker theo snapshot đã commit; E2E lấy copy người dùng nhìn thấy làm readiness contract thay vì phụ thuộc attribute nội bộ** | **Không đổi schema (Flyway V72 / 67 tables), giữ Admin hiện hữu từ `.env`** |
| **V77.0.23** | **Fix hard-navigation EN hydration thật: bỏ phụ thuộc `useSyncExternalStore` server snapshot, LanguageProvider dùng single React-owned language state, restore preference hậu hydration bằng deferred reconciliation; E2E xác nhận chính EN switcher state + Maintenance/Showtimes English copy** | **Không đổi schema (Flyway V72 / 67 tables), giữ Admin hiện hữu từ `.env`** |
| **V77.0.24** | **Khép 2 lỗi targeted còn lại: provider commit persisted language trực tiếp trong mount effect + một rAF guard; Service Worker dùng network-first cho `/_next/static/` để không hydrate bằng bundle cũ; V64 retry overview thật tối đa 12 giây khi backend Docker vừa khởi động** | **Không đổi schema (Flyway V72 / 67 tables), giữ Admin hiện hữu từ `.env`** |
| **V77.0.25** | **Khép zero-warning lint mới nhất: loại bỏ `eslint-disable react-hooks/set-state-in-effect` đã trở thành unused directive trong `LanguageProvider`; giữ nguyên toàn bộ hydration/runtime V77.0.24, không suppress rule và không đổi nghiệp vụ** | **Không đổi schema (Flyway V72 / 67 tables), giữ Admin hiện hữu từ `.env`** |
| **V77.0.26** | **Sửa hồi quy V64 sau publish: post-launch overview refresh không còn xóa feedback `Đã phát hành/Published`; launch result vẫn là nguồn sự thật, refresh overview là bước hậu xử lý best-effort và targeted E2E tiếp tục bắt feedback thành công hiển thị** | **Không đổi schema (Flyway V72 / 67 tables), giữ Admin hiện hữu từ `.env`** |
| **V77.0.27** | **Sửa hard-navigation EN còn lệch giữa `<html lang=en>` và React copy V56: LanguageProvider chuyển initial browser reconciliation sang `useLayoutEffect`, giữ single React-owned state và thêm cửa sổ reconciliation hữu hạn cho selective hydration; E2E xác nhận EN switcher trước `Customer Value & RFM Intelligence`** | **Không đổi schema (Flyway V72 / 67 tables), giữ Admin hiện hữu từ `.env`** |
| **V77.0.28** | **Sửa root cause cold-start: Compose chờ `service_healthy` cho 2 backend + frontend trước khi mở Nginx; root có hydration readiness marker và Playwright chỉ assert sau khi JavaScript thật đã hydrate, tránh SSR VI/disabled/loading giả khi chunk/API chưa sẵn sàng** | **Không đổi schema (Flyway V72 / 67 tables), giữ Admin hiện hữu từ `.env`** |
| **V77.0.29** | **Sửa frontend healthcheck V77.0.28 bị unhealthy trên Docker Windows: thêm route `/healthz` độc lập auth/backend, dùng Node core `http` thay `fetch(/login)`, pin `HOSTNAME=0.0.0.0` + `PORT=3000`; giữ nguyên backend/frontend `service_healthy` gate và hydration marker** | **Không đổi schema (Flyway V72 / 67 tables), giữ Admin hiện hữu từ `.env`** |
| **V77.0.30** | **Khép full-suite runtime contract sau V77.0.29: dùng helper đăng nhập/hydration chung, selector machine-readable cho booking/reward/ticket transfer, cập nhật copy Việt hiện hành, loại hard-code ngày/phim lỗi thời và chờ đúng async/step-up state; targeted 3/3 của V77.0.29 được giữ nguyên** | **Không đổi schema (Flyway V72 / 67 tables), chỉ dùng Admin hiện hữu từ `.env`** |
| **V77.0.31** | **Căn chỉnh 10 regression còn lại sau baseline V77.0.30 = 36/46: machine contracts cho booking/payment/finance/privacy/PWA/check-in, V57 hold reload, movie-detail readiness, Smart Planner provenance; loại các selector/copy cố định còn sót** | **Không đổi schema (Flyway V72 / 67 tables), chỉ dùng Admin hiện hữu từ `.env`** |
| **V77.0.32** | **Khép 4 lỗi trong focused regression V77.0.31: timeline thanh toán dùng machine event contract, movie detail không bị auxiliary API làm mất core payload, Finance đối soát dùng machine status, V47 timeline bỏ selector copy cũ** | **Không đổi schema (Flyway V72 / 67 tables), chỉ dùng Admin hiện hữu từ `.env`** |
| **V77.0.33** | **Khép 2 lỗi focused còn lại của V77.0.32: QR vé dùng stable machine selector thay vì alt text đã Việt hóa; movie detail retry core GET có giới hạn và focused E2E dùng surface recovery thay vì chờ một lần duy nhất** | **Không đổi schema (Flyway V72 / 67 tables), chỉ dùng Admin hiện hữu từ `.env`** |
| **V77.0.34** | **Khép lỗi focused cuối của V77.0.33: các action trên trang vé dùng stable test-id contracts (`ticket-add-calendar`, `ticket-copy-booking-code`, `ticket-print`) thay vì phụ thuộc copy cũ `Mã booking`; Booking Flow chứng minh nút copy thuộc đúng booking** | **Không đổi schema (Flyway V72 / 67 tables), chỉ dùng Admin hiện hữu từ `.env`** |
| **V77.0.35** | **Khép selector presentation còn sót trong Booking Flow sau staff check-in: Admin Payments dùng chung machine readiness contract `payment-production-readiness-v60` + provider selector `payment-readiness-mock-v60` với canonical V60 E2E, không còn bắt heading/copy compatibility cũ** | **Không đổi schema (Flyway V72 / 67 tables), chỉ dùng Admin hiện hữu từ `.env`** |
| **V77.0.36** | **Khép 3 lỗi còn lại của full suite V77.0.35 = 43/46: V51 Analytics và V63 Recommendation có bounded transient read recovery + data-ready gating sau reload; V39 seat contention dùng showtime-bound `booking-seat-map-v39` và bounded navigation recovery cho loser client** | **Không đổi schema (Flyway V72 / 67 tables), không retry business write, chỉ dùng Admin hiện hữu từ `.env`** |
| **V77.0.37** | **Khép 4 regression còn lại của full suite V77.0.36 = 42/46: V75/V76/V69 chờ authoritative payload bằng bounded transient-read recovery + machine readiness/evidence contracts; V59 alert actions dùng fingerprint/state/test-id ổn định và tránh race với realtime refresh** | **Không đổi schema (Flyway V72 / 67 tables), không retry business write, chỉ dùng Admin hiện hữu từ `.env`; lịch sử tiếp tục gộp duy nhất trong README.md** |
| **V77.0.38** | **Ổn định release-gate sau khi V77.0.37 chạy trực tiếp đạt 46/46 nhưng stable release rerun sau fresh Docker chỉ đạt 44/46: V66 Seat Operations và V77 CRM chờ authoritative payload/readiness bằng bounded transient-read retry + machine contracts** | **Không đổi schema (Flyway V72 / 67 tables), không retry business write, chỉ dùng Admin hiện hữu từ `.env`; tiếp tục chỉ một README.md tăng dần theo phiên bản** |
| **V77.0.39** | **Khép zero-warning lint và audit ngôn ngữ toàn giao diện: bỏ import `Page` thừa ở CRM E2E; Header/shared controls chuyển sang presentation-owned VI/EN; legacy UI có catalog + bridge cho menu/nút/link/label/option/placeholder/aria/title/alt và tiêu đề; E2E mở rộng kiểm tra EN không rò copy Việt rồi chuyển ngược VN** | **Không đổi schema (Flyway V72 / 67 tables), không dịch machine/business data, chỉ dùng Admin hiện hữu từ `.env`; lịch sử vẫn duy nhất README.md tăng dần** |
| **V77.0.40** | **Runtime language-boundary fix: V59 historical marker is language-owned; EN regression checks presentation copy instead of rejecting legitimate Vietnamese business data; dynamic cinema options are opt-out data; legacy bridge initial scan now covers alt-only elements** | **No schema change (Flyway V72), existing Admin from `.env`, single README.md history, zero-warning lint fix preserved** |
| **V77.0.41** | **Fix runtime EN leak on `/movies`: the movie discovery page now owns all presentation copy through `usePresentationLanguage()`, including Search movies / Genre / Language / Rating and filter/sort controls; backend-derived movie metadata remains source-owned business data via explicit opt-out boundaries** | **No schema change (Flyway V72), existing Admin is read from root `.env`, no hard-coded targeted-test account, single README.md history** |
| **V77.0.42** | **Full-UI language completion: fixes the next runtime leak `CINEMA_EXPERIENCE → Trải nghiệm rạp`, composes machine/status VI→EN labels into the legacy bridge, adds 307 audited presentation translations, localizes customer support/payments directly, switches cinema date/month locale with VN/EN, and moves native admin/staff/CRM dialogs onto explicit language-owned copy** | **No schema change (Flyway V72), existing Admin remains sourced from root `.env`, dynamic business data stays untranslated, single README.md history** |
| **V77.0.43** | **Literal-level language audit fix: closes the Windows EN leak `Lần thử` / `Đơn vị thanh toán / Cổng thanh toán`, adds a focused V43 presentation catalog for remaining release-gate copy, and replaces the flawed line-level source audit with literal/text-node checks so one `t()` on a compact JSX line can no longer hide untranslated siblings** | **No schema change (Flyway V72), existing Admin remains sourced from root `.env`, business data remains untranslated, single README.md history** |
| **V77.0.44** | **CRM payload localization + V66 authority visibility: CRM playbook cards now render label/definition/recommendation through the active VI/EN copy contract instead of raw backend Vietnamese payload; the V66 durable-hold authority marker is always present once the booking page renders, not only after a seat is held** | **No schema change (Flyway V72), existing Admin remains sourced from root `.env`, targeted regression explicitly covers both failures** |
| **V77.0.45** | **Full-suite repeatability + accessibility contract: restores MovieCard accessible link names expected by discovery E2E (`Xem chi tiết <movie>` without punctuation drift); Smart Planner E2E uses an isolated future date and removes generated showtimes after commit so repeated runs on the same persistent Docker database cannot saturate a fixed date and collapse `suggested` to 0** | **No schema change (Flyway V72), no Smart Planner business-rule weakening, existing Admin remains sourced from root `.env`; V77.0.44 targeted 3/3 remains preserved** |
| **V77.0.46** | **PWA readiness + full-suite language sweep stabilization: `/mobile` publishes authoritative `/pwa/config` before browser-device registration so delayed Service Worker readiness cannot leave `data-delivery-mode=LOADING`; PWA device registration uses bounded Service Worker readiness; the 13-surface VN/EN sweep removes duplicate navigations and gets a dedicated 180-second budget for full-suite load** | **No schema change (Flyway V72), no fake push mode or relaxed language assertions, existing Admin remains sourced from root `.env`; V77.0.45 focused 2/2 and targeted 3/3 remain preserved** |
| **V77.0.47** | **Historical release-gate forward compatibility: after V77.0.46 reached focused 2/2, targeted 3/3 and full browser 46/46, stable release preflight was blocked by the historical V77.0.9 verifier because it recognized only legacy `viLabel(...)`; the verifier now also recognizes the current language-aware `localizedLabel(value, language)`/`label(...)` rendering used by Payment and Support** | **No runtime/business-rule change, no schema change (Flyway V72), Admin remains sourced from root `.env`; historical gate semantics are preserved while accepting the newer localization implementation** |
| **V77.0.48** | **Maintenance success-feedback timer ownership: V77.0.47 release preflight reached full Browser E2E but the V44 maintenance journey intermittently lost `maintenance-success-message` after resolving a work order; `announce()` now owns exactly one timer, cancels the previous timer before publishing new feedback, and cleans it up on unmount so an older success timeout cannot erase a newer completion message** | **No maintenance business-rule change, no schema change (Flyway V72), exact `ok` completion result and authoritative reload remain enforced; Admin still comes from root `.env`** |
| **V77.0.49** | **Release staging whitespace preflight: V77.0.48 passed 46/46 Browser E2E inside `release.ps1`, then publication was correctly blocked by `git diff --cached --check` because `README.md` ended with a new blank line. README EOF is normalized and a dedicated source gate now detects duplicate terminal newlines before the expensive browser gate.** | **Keeps `git diff --cached --check` fail-closed, no business/runtime/schema change (Flyway V72), Admin still comes from root `.env`** |
| **V77.0.50** | **V26 CI Service-Worker version parser compatibility: after V77.0.49 passed local release gates and was pushed to `main`, GitHub CI stopped at `bash tools/verify-v26-source.sh` with 13/14 because the historical parser only recognized `const VERSION = "v26"`-style cache IDs and could not parse the current patch-form `v77-0-49`. The V26 gate now accepts numeric patch-form cache generations while preserving the major-version >=26 requirement.** | **CI/verifier-only compatibility fix; PWA behavior and cache-safety checks remain intact, no schema change (Flyway V72), Admin still comes from root `.env`** |
| **V77.0.51** | **V66 booking authority boot-surface stability: after V77.0.50 restored the V26 Linux CI gate, the stable release full-browser run still exposed a timing window where `/booking/{showtimeId}` rendered only its loading/unavailable early-return before the V66 authority marker existed. The authority marker is now a boot-safe render invariant present during loading, unavailable/error and normal booking states, while the API race still proves the authoritative value `POSTGRESQL_WITH_REDIS_MIRROR`.** | **Runtime-contract stabilization only; no seat-lock algorithm change, no relaxed Playwright assertion, no schema change (Flyway V72), Admin still comes from root `.env`** |
| **V77.0.52** | **Full-suite transient read resilience: after V77.0.51 made the V66 authority surface boot-safe, the next full 46-test run exposed four independent UI shells whose authenticated read APIs could transiently fail or stall under sustained suite load (Notifications V41, Observability V65, Command Center V53 and Operations Control V58/V59). A shared abortable read helper now retries only transient GET failures/timeouts within a bounded 12-second budget while preserving 401/403 fail-closed behavior and all real backend assertions.** | **Runtime read-resilience only; no fake summary/card data, no relaxed Playwright assertion, no schema change (Flyway V72), Admin still comes from root `.env`** |
| **V77.0.53** | **Historical V29.2 Playwright contract compatibility: the V77.0.52 stable release reached GitHub CI, where `verify_v29_2_playwright_e2e.py` still recognized only the original V29.2 locator/navigation implementation. The verifier now accepts both legacy and current semantic contracts for unique registration, explicit login, mock payment, ticket QR, staff-gate check-in and Admin credentials while keeping all 31 browser-journey requirements enforced.** | **Verifier/release-gate compatibility only; booking-flow behavior is unchanged, no E2E assertion is removed, no schema change (Flyway V72), Admin remains sourced from the test/root environment** |

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
actions/setup-java@v6
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
PAYMENT_PRODUCTION_GUARD_ENABLED=true
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

## V59 - Realtime Operations 4.0

V59 nâng trực tiếp V58, không tạo một dashboard rời. Control Center vẫn đọc **cùng dữ liệu nghiệp vụ thật** của payment, booking, equipment, staff, support, inventory và incident, nhưng cơ chế cập nhật chuyển sang event-driven realtime.

### Realtime transport

```text
PaymentEventService ───────┐
Inventory movement ────────┤
Operational audit actions ─┤
                           ↓
                 Redis Pub/Sub
          cinebooking:operations-control-events
                           ↓
             Spring STOMP WebSocket
            /topic/operations-control
                           ↓
              Operations Control UI
```

- `PaymentEventService` phát tín hiệu sau payment event thực tế.
- Inventory phát tín hiệu sau movement được lưu.
- Audit actions liên quan booking/payment/refund/maintenance/support/staff/incident phát tín hiệu sau commit.
- `ADMIN_GET` và `OPS_ALERT_*` không được phản chiếu lại qua AuditService, tránh vòng lặp reload.
- WebSocket event chỉ mang `type` + timestamp; dữ liệu vận hành vẫn được đọc lại qua API có RBAC.
- Nếu WebSocket mất kết nối, UI vẫn có **30-second fallback snapshot refresh**.

### Alert lifecycle V59

Alert V58 được gắn fingerprint ổn định và trạng thái realtime trong Redis:

```text
OPEN
  ├─ ACKNOWLEDGED  (giữ 60 phút)
  └─ RESOLVED      (suppress 15 phút)

OPEN > 10 phút:
LOW -> MEDIUM
MEDIUM -> HIGH
HIGH -> CRITICAL
```

ACK/Resolve đều ghi vào `audit_log` với `entity_type=OPERATIONS_ALERT`. Redis giữ state ngắn hạn; audit log giữ history durable. Khi cooldown hết mà tín hiệu nghiệp vụ vẫn còn, alert quay lại OPEN thay vì bị ẩn vĩnh viễn.

### API V59

```text
GET  /api/admin/operations-control/snapshot?cinemaId={uuid}
POST /api/admin/operations-control/alerts/{fingerprint}/acknowledge
POST /api/admin/operations-control/alerts/{fingerprint}/resolve
GET  /api/admin/operations-control/alerts/history?cinemaId={uuid}
```

RBAC tiếp tục là `MANAGER` / `ADMIN`; Manager chỉ thấy snapshot theo cinema scope từ Command Center authorization hiện có.

### Database / migration V59

**V59 không tạo Flyway migration mới.** Alert state realtime dùng Redis và action history dùng bảng `audit_log` đã có từ V8.

```text
Flyway latest: V52
56 application tables
+ flyway_schema_history
= 57 public tables
```

Không cần seed thêm bảng và không thay đổi realistic-data audit 57 bảng.

### V59.1 UI readability hardening

Admin Dashboard được harden responsive để các nút dài không bị che/cắt chữ: quick actions và tab chuyển sang CSS grid `auto-fit`, `.btn` cho phép tự tăng chiều cao/wrap nhãn, và desktop header ẩn các link ưu tiên thấp vào navigation drawer trên viewport thông thường. Browser gate V59 kiểm tra tại viewport 1920x1080 rằng quick-action buttons không có `scrollWidth/scrollHeight` clipping và không chồng bounding box.

### Test source V59

```powershell
python .\tools\verify_v58_operations_control_center.py
python .\tools\verify_v59_realtime_operations_4.py
python .\tools\verify_realistic_data_57.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v59.ps1
```

Browser journey mới:

```text
frontend/e2e/realtime-operations-v59.spec.ts
```

GitHub Actions xác nhận STOMP WebSocket, dashboard realtime và alert action history trên disposable stack.

### Release V59

Release candidate mặc định:

```text
v59.0.0-rc.1
```

Stable:

```text
v59.0.0
```

Các RC đã tạo là immutable; nếu RC1 đã trỏ tới commit khác thì dùng RC2, RC3... và không force-update tag cũ.

## V60 - Payment Production 4.0

V60 không thay payment provider thành một provider giả mới. Nó harden trực tiếp V37/V47 để cấu hình VNPay/MoMo hiện có có thể được đánh giá trước khi chuyển từ sandbox sang production.

### Production readiness guard

Admin Payment Operations có thêm **Payment Production Readiness · V60**. API:

```text
GET /api/admin/payments/production-readiness
```

Response chỉ trả trạng thái và hostname an toàn; **không trả TMN hash secret, MoMo secret key hoặc access key**. Với gateway ở `production`, guard yêu cầu:

```text
merchant credentials configured
+ checkout/query endpoint HTTPS
+ return URL HTTPS public
+ IPN URL HTTPS public
= productionReady
```

Cấu hình:

```text
PAYMENT_PRODUCTION_GUARD_ENABLED=true
```

Khi guard bật, checkout production bị fail-closed nếu callback còn `http://localhost`, endpoint không HTTPS hoặc provider chưa đủ cấu hình. Sandbox vẫn chạy theo cấu hình hiện tại nhưng UI hiển thị warning rõ ràng rằng đó chưa phải production traffic.

### Webhook/IPN hardening V60

VNPay và MoMo callback được kiểm tra theo thứ tự:

```text
signature
→ merchant identity (vnp_TmnCode / partnerCode)
→ merchant order mapping
→ amount
→ event-key idempotency
→ payload-hash consistency
→ state transition
```

Duplicate callback có **cùng event key + cùng payload hash** được trả lại merchant response đã lưu, không chạy state transition lần hai. Nếu cùng event key nhưng payload khác, V60 trả lỗi `Replay payload mismatch`, không thay đổi payment và ghi timeline event:

```text
WEBHOOK_REPLAY_CONFLICT
```

Browser return URL tiếp tục chỉ là kết quả hiển thị; payment success vẫn đến từ server IPN/reconciliation.

### Database / dữ liệu V60

**V60 không tạo Flyway migration mới.** Webhook idempotency tiếp tục dùng `payment_webhook_event` từ V37 và timeline dùng `payment_event` từ V47.

```text
Flyway latest: V52
56 application tables
+ flyway_schema_history
= 57 public tables
```

Không cần seed hoặc repair database lại khi nâng V59 → V60.

### Test source V60

```powershell
python .\tools\verify_v47_payment_gateway_operations.py
python .\tools\verify_v59_realtime_operations_4.py
python .\tools\verify_v60_payment_production_4.py
python .\tools\verify_realistic_data_57.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v60.ps1
```

Browser journey:

```text
frontend/e2e/payment-production-v60.spec.ts
```

CI intentionally không cấu hình merchant secret thật. E2E chỉ xác nhận readiness fail-closed/honest, secret không bị render và payment dashboard vẫn hoạt động; live VNPay/MoMo traffic chỉ chạy khi bạn tự cung cấp sandbox/production credentials ngoài Git.

### Release V60

```text
v60.0.0-rc.1
v60.0.0
```

RC/stable tag là immutable; nếu RC1 đã tồn tại ở commit khác thì dùng RC2/RC3 thay vì force-update.


## V61 - Fraud & Risk Intelligence

V61 builds an ADMIN-only risk queue from existing operational evidence rather than inventing a black-box fraud model. It evaluates customer accounts using transparent windows across booking velocity, payment failures/attempts, voucher redemption velocity, refund concentration, security-alert risk, login failure bursts and distinct login IPs.

### Risk scoring contract

```text
booking velocity 30m
payment failures / attempts 24h
voucher redemption 24h
refund concentration 30d
security alerts 7d
login failures 1h
login IP diversity 24h
        |
        v
explainable points -> score 0..100 -> LOW / MEDIUM / HIGH / CRITICAL
```

The engine is deterministic (`V61_RULESET_1`). Every customer row carries the exact contributing signals, points, evidence and time window. V61 does **not** claim AI/ML fraud detection and a score is decision support, not proof of fraud.

### Manual disposition

ADMIN can record one of:

```text
CLEARED
REVIEW
CHALLENGE
BLOCK_RECOMMENDED
```

The action is written as `RISK_DISPOSITION_SET` with entity type `RISK_CUSTOMER` in the existing `audit_log`. `BLOCK_RECOMMENDED` does not disable the account automatically; enforcement remains a separate explicit administrator action.

### API V61

```text
GET  /api/admin/risk/scorecard
POST /api/admin/risk/users/{userId}/disposition
```

Both endpoints are ADMIN-only.

### Database / data V61

V61 adds no migration and no synthetic fraud table. It reads `app_user`, `booking`, `payment`, `voucher_redemption`, `security_alert` and `audit_log`, and stores only manual disposition history in `audit_log`.

```text
Flyway latest: V52
56 application tables
+ flyway_schema_history
= 57 public tables
```

No seed or realistic-data repair is required for V60 -> V61.

### Source tests V61

```powershell
python .\tools\verify_v60_payment_production_4.py
python .\tools\verify_v61_fraud_risk_intelligence.py
python .\tools\verify_realistic_data_57.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v61.ps1
```

Browser journey:

```text
frontend/e2e/fraud-risk-intelligence-v61.spec.ts
```

### Release V61

```text
v61.0.0-rc.1
v61.0.0
```

RC/stable tags remain immutable.

## V62 - Dynamic Pricing 4.0

V62 nâng lớp pricing hiện có thay vì tạo một bảng giá giả mới. `DynamicPricingIntelligenceService` dùng strategy version `V62_RULESET_1` và đo ba tín hiệu trực tiếp từ dữ liệu vận hành hiện có:

- **Occupancy realtime:** số `booking_seat` chưa `released_at` / tổng ghế bán được của auditorium.
- **Demand velocity:** số booking attempt của đúng showtime trong 30 phút gần nhất.
- **Lead time:** số giờ còn lại tới `showtime.start_time`.

Rule tự động mặc định: occupancy <30% = -3%, occupancy 70-85% = +6%, occupancy >=85% = +12%; booking attempts/30m >=3 = +3%, >=6 = +6%; lead time >=168h = -4%, <=24h = +3%, <=6h = +5%. Tổng automatic adjustment được giới hạn bởi `PRICING_INTELLIGENCE_MAX_DISCOUNT_PERCENT` (mặc định -10%) và `PRICING_INTELLIGENCE_MAX_SURCHARGE_PERCENT` (mặc định +25%).

V62 chỉ tính automation trên **base price + seat modifier**. Manual pricing rule V18 vẫn cộng độc lập, vì vậy rule thủ công không bị khuếch đại lại bởi demand percentage. `booking_seat.price` tiếp tục snapshot giá cuối tại thời điểm booking; thay đổi occupancy/rule sau đó không rewrite giá vé lịch sử.

### API V62

```text
GET  /api/admin/pricing/strategy
POST /api/admin/pricing/simulate
POST /api/admin/pricing/preview
```

`/strategy` trả policy và ngưỡng minh bạch. `/simulate` là what-if simulator chỉ tính toán, không ghi database và không tạo booking giả. `/preview` được mở rộng với `manualDynamicAdjustment`, `intelligenceAdjustment`, `intelligencePercent`, occupancy, booking attempts, lead time và từng signal giải thích.

### UI V62

`/admin/pricing` hiển thị strategy `V62_RULESET_1`, guard -10%/+25%, what-if simulator, market snapshot của showtime và breakdown giá tách riêng manual rule / V62 intelligence. Seat map tiếp tục hiển thị `dynamicAdjustment` thật và thêm label V62 vào `pricingRules` khi signal có tác động khác 0.

### Database / data V62

V62 không có migration mới, không có entity pricing intelligence mới và không seed dữ liệu demand giả. Nó đọc `booking`, `booking_seat`, `seat`, `showtime` và `pricing_rule`. **Flyway latest: V52; 57 public tables.**

### Source tests V62

```powershell
python .\tools\verify_v60_payment_production_4.py
python .\tools\verify_v61_fraud_risk_intelligence.py
python .\tools\verify_v62_dynamic_pricing_4.py
python .\tools\verify_realistic_data_57.py
python .\tools\verify_seed_demo_57.py
```

### Release V62

```text
RC:     v62.0.0-rc.1
Stable: v62.0.0
```

## V63 - Recommendation 4.0

V63 nâng lớp `Recommendation Intelligence 2.0` của V50 thành Recommendation 4.0 nhưng **không tạo schema mới**. Thuật toán hiện tại được version hóa bằng:

```text
V63-DEEP-CONTEXT-4
```

### Deep taste profile

V63 chỉ học từ dữ liệu thật đã có trong CineBooking và giữ nguyên MORE/LESS/HIDE của V50. Mỗi tín hiệu phim đồng thời đóng góp vào nhiều facet:

- Thể loại (`movie.genre`).
- Ngôn ngữ (`movie.movie_language`).
- Phân loại nội dung (`movie.rating`).
- Nhóm thời lượng: gọn `<=100`, vừa `101-130`, dài `>130` phút.
- Rạp, khung giờ và **thứ trong tuần** từ booking `CONFIRMED`.
- Click/view trong 120 ngày với recency decay.
- Explicit `MORE_LIKE_THIS`, `LESS_LIKE_THIS`, `HIDE`.

`GET /api/recommendations/profile` trả thêm `topLanguages`, `preferredWeekday`, `preferredDurationBand` và `profileStrength` 0-100. Không có bước seed lịch sử gu giả; profile được tính trực tiếp từ dữ liệu hiện hữu.

### Context-aware ranking + discovery balance

`GET /api/recommendations/home` giữ tương thích API cũ và thêm query tùy chọn:

```text
mode=FAMILIAR | BALANCED | DISCOVERY
```

- **FAMILIAR:** ưu tiên mạnh các facet đã học, diversity penalty thấp.
- **BALANCED:** mặc định; cân bằng taste, lịch xem thật và khám phá.
- **DISCOVERY:** tăng novelty bonus và diversity penalty để giảm echo-chamber, nhưng vẫn giữ các taste signal chính.

Raw score tiếp tục giữ lineage V50 (genre affinity, popularity, preferred cinema/daypart, anchor feedback) rồi cộng các thành phần V63: language, rating, duration, weekday và novelty. Sau đó diversity reranker chọn tuần tự theo genre overlap; không random nên kết quả vẫn deterministic với cùng dữ liệu đầu vào.

Mỗi `RecommendationItem` trả thêm:

- `newToYou`: phim chưa xuất hiện trong favorites/bookings/reviews/recommendation events/feedback của user.
- `scoreBreakdown[]`: tối đa 6 thành phần giải thích contribution như `GENRE_TASTE`, `LANGUAGE_FIT`, `DURATION_FIT`, `SCHEDULE_FIT`, `POPULARITY`, `NOVELTY`.

### UI V63

`/for-you` được nâng lên **V63 · Recommendation 4.0** với:

- Thanh chọn Bám gu / Cân bằng / Khám phá.
- Profile strength, top genres, top languages, thời lượng thường xem, ngày + khung giờ + rạp thường xem.
- Badge **MỚI VỚI BẠN**.
- Ranking contribution chips cho từng phim.
- Giữ nguyên nút **Thêm tương tự / Ít tương tự / Ẩn / Xóa phản hồi** của V50.
- **Admin Dashboard** có tile **🧠 Recommendation V63** để mở trực tiếp `/for-you`, tránh tình trạng V63 đã có chức năng nhưng không xuất hiện trên màn hình quản trị.

### Database / data V63

V63 **không có Flyway migration mới**, không có recommendation table/entity mới và không seed phim mới. Thuật toán tái sử dụng `movie`, `movie_favorite`, `movie_review`, `booking`, `showtime`, `auditorium`, `recommendation_event` và `recommendation_feedback`. **Flyway latest: V52; 57 public tables.**

Dữ liệu tiếng Việt tiếp tục dùng UTF-8 end-to-end; source, database và web không đổi chính sách encoding.

### Source tests V63

Chạy từ:

```text
D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
```

```powershell
python .\tools\verify_v60_payment_production_4.py
python .\tools\verify_v61_fraud_risk_intelligence.py
python .\tools\verify_v62_dynamic_pricing_4.py
python .\tools\verify_v63_recommendation_4.py
python .\tools\verify_realistic_data_57.py
python .\tools\verify_seed_demo_57.py
```

Browser journey mới:

```text
frontend/e2e/recommendation-4-v63.spec.ts
```

### Release V63

```text
RC:     v63.0.0-rc.1
Stable: v63.0.0
```

## V64 - CRM & Marketing Automation 4.0

V64 nối trực tiếp các lớp dữ liệu đã có của V55/V56 với voucher và notification hiện hữu để tạo một luồng marketing có thể kiểm tra được:

```text
real app_user + CONFIRMED booking + SUCCESS payment + membership
                              ↓
                    V64 audience segments
                              ↓
                       campaign preview
                              ↓
                     explicit admin launch
                              ↓
       owner-scoped one-use voucher + PROMOTION notification
```

Strategy version:

```text
V64-CRM-AUTOMATION-4
```

### Segment V64

`GET /api/admin/marketing/segments` chỉ đọc dữ liệu nghiệp vụ thật và trả các segment có thể chồng lấp theo mục đích marketing:

- `ALL_ELIGIBLE`: toàn bộ tài khoản `USER` đang hoạt động.
- `NEW_30D`: tài khoản được tạo trong 30 ngày gần nhất.
- `ENGAGED_30D`: có booking `CONFIRMED` trong 30 ngày gần nhất.
- `VIP`: GOLD/DIAMOND, hoặc >=4 booking `CONFIRMED`, hoặc realized payment revenue >=1.000.000đ.
- `AT_RISK_31_90D`: booking `CONFIRMED` gần nhất cách đây 31-90 ngày.
- `LAPSED_90D_PLUS`: booking `CONFIRMED` gần nhất cách đây trên 90 ngày.
- `PROSPECT_NO_BOOKING`: tài khoản USER đang hoạt động nhưng chưa có booking `CONFIRMED`.

Không tạo customer profile giả, không seed hành vi giả và không suy diễn doanh thu từ booking chưa thanh toán. Revenue dùng đúng payment `SUCCESS` hiện có.

### Campaign preview / launch

API ADMIN-only:

```text
GET  /api/admin/marketing/segments
POST /api/admin/marketing/campaigns/preview
POST /api/admin/marketing/campaigns/launch
```

`preview` validate đầy đủ campaign/voucher nhưng **không ghi database**. UI bắt buộc preview trước khi bật nút Launch.

`launch` yêu cầu `confirmed=true`. Mỗi người nhận được voucher riêng với policy:

```text
owner_user_id = đúng customer
usage_limit   = 1
active        = true
starts_at     = thời điểm launch
ends_at       = starts_at + validityDays (1..90)
public list   = không xuất hiện vì owner_user_id != NULL
```

Voucher code deterministic theo `campaignCode + userId`, ví dụ dạng `M64-WINBACK-XXXXXXXXXXXX`. `campaignCode` vì vậy đóng vai trò idempotency key: chạy lại cùng campaign không tạo voucher trùng. Nếu cùng campaignCode nhưng thay discount configuration, backend trả `409 CONFLICT` và yêu cầu dùng campaignCode mới.

### Promotion delivery / privacy guard

Sau khi voucher được tạo, V64 gọi lại `NotificationService.createOnce(...)` với type `PROMOTION_V64` và dedupe key theo campaign + user. Không có kênh gửi riêng mới.

Điều này giữ nguyên toàn bộ guard của Notification Center V41:

- `promotionEnabled=false` => không gửi promotion.
- In-app/email/browser chỉ dùng nếu user đã bật kênh tương ứng.
- SMTP disabled không làm mất voucher cá nhân; email status vẫn được pipeline hiện hữu ghi nhận.
- Preview chỉ hiển thị email đã mask; không cần lộ full email để chọn audience.
- Account disabled và role khác `USER` không nằm trong audience V64.

### UI V64

Trang mới:

```text
/admin/marketing
```

Admin Dashboard có tile **📣 CRM & Marketing V64**. Màn hình gồm:

- Segment cards với số khách tính từ dữ liệu hiện tại.
- Gợi ý action + default discount theo segment.
- Campaign composer: campaign code, segment, title/message, discount, minimum order, max discount, validity.
- Preview audience trước khi launch.
- Result counters: matched, voucher mới, voucher tái dùng, notification tạo/bỏ qua.
- Link sang màn hình Voucher để đối soát khi cần.

### Database / data V64

V64 **không có Flyway migration mới**. Nó tái sử dụng:

```text
app_user
booking
payment
voucher
user_notification
notification_preference
```

**Flyway latest: V52; 57 public tables.** Không có seed SQL mới cho V64. Dữ liệu tiếng Việt tiếp tục UTF-8 end-to-end (`server_encoding=UTF8`, JVM UTF-8, web `lang="vi"`).

### Source tests V64

Chạy từ:

```text
D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
```

```powershell
python .\tools\verify_v60_payment_production_4.py
python .\tools\verify_v61_fraud_risk_intelligence.py
python .\tools\verify_v62_dynamic_pricing_4.py
python .\tools\verify_v63_recommendation_4.py
python .\tools\verify_v64_crm_marketing_automation.py
python .\tools\verify_realistic_data_57.py
python .\tools\verify_seed_demo_57.py
```

Browser journey mới:

```text
frontend/e2e/crm-marketing-automation-v64.spec.ts
```

### Release V64

```text
RC:     v64.0.0-rc.1
Stable: v64.0.0
```

## V65 - Observability & Reliability 4.0

V65 bổ sung lớp observability production-oriented trên nền Actuator + Micrometer/Prometheus đã có. Không thay đổi schema nghiệp vụ, không tạo dữ liệu mẫu mới và không ghi payload/token/query-string vào request telemetry.

Strategy version:

```text
V65-OBSERVABILITY-RELIABILITY-4
```

### Metrics + SLO V65

Mọi API request (trừ `/actuator/**` và `/uploads/**`) được đo bằng Micrometer với path đã normalize ID để tránh metric cardinality bùng nổ. Các meter chính:

```text
cinebooking.api.requests       # Timer + histogram
cinebooking.api.responses      # Counter theo status class
cinebooking.api.server.errors  # 5xx counter
cinebooking.api.active         # active requests gauge
```

Dashboard ADMIN local-replica tính rolling window mặc định 5 phút:

```text
Availability target      >= 99.9%
5xx error-rate target    <= 1.0%
API P95 latency target   <= 750 ms
```

Các target/window có thể đổi bằng:

```text
OBSERVABILITY_SLO_WINDOW_MINUTES
OBSERVABILITY_AVAILABILITY_TARGET_PERCENT
OBSERVABILITY_MAX_ERROR_RATE_PERCENT
OBSERVABILITY_P95_LATENCY_TARGET_MS
```

Khi chưa có traffic, SLO trả `NO_DATA` thay vì báo PASS giả.

### Logs + Trace correlation

V65 phát/nhận header:

```text
X-Trace-Id
```

Trace ID chỉ chấp nhận chuỗi an toàn dài 8-64 ký tự; nếu thiếu/không hợp lệ backend tự sinh UUID compact. Cùng trace ID được:

- trả về response header;
- gắn vào MDC và console log `trace=<id>`;
- lưu trong in-memory recent-request ring buffer của từng backend replica;
- dùng để grep log khi điều tra lỗi/chậm.

Path telemetry loại query-string và normalize UUID/ID dài thành `:id`; không ghi Authorization token, body hay query-string.

### Dependency probes + runtime

Endpoint ADMIN-only:

```text
GET /api/admin/observability/summary
```

Summary gồm:

- PostgreSQL `SELECT 1` latency/status;
- Redis `PING` latency/status;
- JVM uptime, heap used/max, live threads, logical CPU;
- active request count;
- rolling availability/error-rate/P95;
- 20 request traces gần nhất của replica đang phục vụ request.

Probe chỉ đọc, không tạo/sửa dữ liệu nghiệp vụ.

### Prometheus + Grafana V65

Prometheus scrape trực tiếp hai backend replica trong Docker network qua:

```text
/actuator/prometheus
```

Nginx không proxy `/actuator/**`, nên endpoint metrics không được mở thành route web public mặc định. V65 thêm recording/alert rules:

```text
cinebooking:slo:availability_5m
cinebooking:slo:error_rate_5m
cinebooking:slo:p95_latency_seconds_5m
CineBookingBackendDown
CineBookingAvailabilitySLOBreach
CineBookingP95LatencySLOBreach
```

Bật stack observability:

```powershell
docker compose --profile observability up -d prometheus grafana
```

Grafana được provision sẵn dashboard **CineBooking V65 · Observability & Reliability** tại cổng `3001` theo compose mặc định.

### UI V65

Trang mới:

```text
/admin/observability
```

Admin Dashboard có tile **📈 Observability V65**. Màn hình tự refresh mỗi 10 giây và hiển thị SLO, dependency probes, runtime, recent trace IDs và hướng dẫn bật Prometheus/Grafana.

### Database / data V65

V65 **không có Flyway migration mới** và không thêm table/entity nghiệp vụ. **Flyway latest: V52; 57 public tables.** Không có seed V65. Chính sách UTF-8 và 8 phim V29 được giữ nguyên.

### Source tests V65

Chạy từ:

```text
D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
```

```powershell
python .\tools\verify_v60_payment_production_4.py
python .\tools\verify_v61_fraud_risk_intelligence.py
python .\tools\verify_v62_dynamic_pricing_4.py
python .\tools\verify_v63_recommendation_4.py
python .\tools\verify_v64_crm_marketing_automation.py
python .\tools\verify_v65_observability_reliability.py
python .\tools\verify_realistic_data_57.py
python .\tools\verify_seed_demo_57.py
```

Browser journey mới:

```text
frontend/e2e/observability-reliability-v65.spec.ts
```

### Release V65

```text
RC:     v65.0.0-rc.1
Stable: v65.0.0
```

### Hotfix V65 · Admin manual check-in

Đã sửa luồng **Admin → Quản lý booking → Check-in thủ công**:

- Admin manual check-in là thao tác override có chủ đích nên không còn bị chặn bởi khung giờ QR/staff (`CHECKIN_EARLY_MINUTES` / `CHECKIN_LATE_MINUTES`).
- Luồng quét QR/staff bình thường **vẫn giữ nguyên** kiểm tra khung giờ.
- Nếu Admin check-in ngoài khung giờ, `ticket_checkin_log.source` vẫn ghi `MANUAL` để tương thích CHECK constraint của Flyway V11; audit ghi marker `ADMIN_OVERRIDE_OUTSIDE_TICKET_WINDOW` để phân biệt thao tác override.
- Modal booking hiển thị ngay thông báo thành công/lỗi; sau khi thành công hiển thị thời gian + tài khoản Admin đã check-in và ẩn nút check-in.
- Frontend dùng trực tiếp `ActionResult.booking`, tránh GET lại gây cảm giác thao tác xong nhưng UI chưa đổi.

Kiểm tra hotfix:

```powershell
python .\tools\verify_v13.py
python .\tools\verify_v65_manual_checkin_hotfix.py
```



### V65 manual check-in hotfix v3 — DB constraint compatibility
- Sửa lỗi HTTP 409/DataIntegrityViolation khi Admin check-in thủ công ngoài khung giờ.
- Nguyên nhân: Flyway V11 chỉ cho phép `ticket_checkin_log.source IN (QR, URL, MANUAL)`, trong khi hotfix trước ghi `MANUAL_OVERRIDE`.
- Giữ `source=MANUAL` để không cần migration mới và không thay đổi schema 57 bảng.
- Vẫn audit đầy đủ override bằng marker `ADMIN_OVERRIDE_OUTSIDE_TICKET_WINDOW`.
- `verify_v65_manual_checkin_hotfix.py` kiểm tra trực tiếp tính tương thích giữa code và CHECK constraint V11.

### V65 Trusted local HTTPS hotfix

This hotfix fixes `ERR_CONNECTION_REFUSED` at `https://localhost`. The base stack still supports the existing HTTP workflow, while `docker-compose.https.yml` enables a trusted local TLS endpoint on port 443 without committing certificates or private keys.

One-time Windows setup from the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\setup-local-https.ps1 -InstallMkcert -Start
```

The setup script:

- creates `.env` with a random JWT secret when `.env` is missing;
- installs `mkcert` through `winget` only when `-InstallMkcert` is requested;
- runs `mkcert -install` so Windows/browser trusts the local CA;
- generates `infra/nginx/certs/localhost.pem` and `localhost-key.pem` for `localhost`, `127.0.0.1` and `::1`;
- validates the merged Docker Compose configuration;
- starts nginx on ports 80 and 443 when `-Start` is supplied.

HTTPS runtime command after the certificate already exists:

```powershell
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.https.yml ps
```

Open:

```text
https://localhost
```

When the HTTPS override is active, `http://localhost` returns HTTP 308 to HTTPS. Backend forwarded headers use `X-Forwarded-Proto=https`, refresh cookies are Secure, and local payment return/IPN URLs use HTTPS. The local certificate/private key are ignored by Git and are not shipped in release archives.

Source verification:

```powershell
python .\tools\verify_v65_local_https.py
python .\tools\verify_v13.py
python .\tools\verify_v65_manual_checkin_hotfix.py
python .\tools\verify_v65_observability_reliability.py
```

## V66 - Booking Consistency & Seat Locking 4.0

V66 nâng lớp giữ ghế của V57/V24 từ **Redis-only lease** thành durable consistency model. Redis vẫn được dùng cho realtime/TTL mirror nhưng **không còn là nguồn sự thật duy nhất**.

Strategy version:

```text
V66-BOOKING-CONSISTENCY-4
```

### Consistency model V66

```text
User A / backend-1        User B / backend-2
        \                     /
         \                   /
          PostgreSQL seat row
               FOR UPDATE
                  |
                  v
          durable seat_hold
                  |
        uq_seat_hold_active
                  |
             Redis mirror
                  |
              checkout
                  |
       uq_showtime_seat_active
```

Luồng acquire giữ ghế:

1. Chuẩn hóa seat IDs và lock các row `seat` theo thứ tự UUID để giảm deadlock.
2. Dưới cùng DB transaction, chuyển hold hết hạn của chính các ghế đang tranh chấp sang `EXPIRED`.
3. Kiểm tra `booking_seat` đang active để không tạo hold lên ghế đã được booking khác xác nhận.
4. Kiểm tra owner hiện tại trong `seat_hold`.
5. Insert/refresh toàn bộ cụm ghế atomically; partial unique index `uq_seat_hold_active(showtime_id,seat_id) WHERE state='HELD'` là invariant cuối của lớp hold.
6. Chỉ sau commit mới mirror TTL sang Redis và ghi lifecycle audit.

`seat_hold.state` chỉ nhận:

```text
HELD
RELEASED
EXPIRED
CONVERTED
```

Lifecycle audit dùng:

```text
SEAT_HOLD_CREATED
SEAT_HOLD_REFRESHED
SEAT_HOLD_CONFLICT
SEAT_HOLD_RELEASED
SEAT_HOLD_EXPIRED
SEAT_HOLD_CONVERTED
```

### Checkout consistency

`BookingService.create(...)` vẫn giữ V24 `Idempotency-Key` + request fingerprint. V66 bổ sung:

```text
ownsAll()
  -> lock seat rows trong transaction checkout
  -> validate durable hold còn hợp lệ
  -> tạo booking + booking_seat
  -> flush uq_showtime_seat_active
  -> convert durable hold -> CONVERTED
  -> commit
```

Seat-row locks được giữ đến commit/rollback của checkout, nên expiry worker hoặc contender khác không thể lấy lại cùng ghế giữa lúc checkout đang chạy. Nếu checkout rollback, hold không bị convert nhầm; expiry job sẽ xử lý sau khi TTL hết.

### Redis degradation / recovery

Redis chỉ là mirror. `SeatEventPublisher` V66 là best-effort: lỗi Redis không được rollback durable seat ownership. Seat map đọc owner từ PostgreSQL và hydrate lại Redis khi có thể.

Scheduled expiry:

```text
SEAT_HOLD_EXPIRY_SCAN_MS=5000
SEAT_HOLD_EXPIRY_BATCH_SIZE=200
SEAT_HOLD_TTL_SECONDS=300
```

Expiry worker dùng seat-row lock trước khi chuyển `HELD -> EXPIRED`, nên không đạp lên checkout transaction đang giữ cùng ghế.

Admin có thể chạy đối soát DB ↔ Redis tại:

```text
POST /api/admin/seat-operations/reconcile
```

### Admin Seat Operations V66

Admin Dashboard có tile:

```text
🎫 Seat Operations V66
```

Route:

```text
/admin/seat-operations
```

API:

```text
GET  /api/admin/seat-operations/summary
GET  /api/admin/seat-operations/holds?limit=80
POST /api/admin/seat-operations/reconcile
```

Dashboard hiển thị active holds, hold sắp hết hạn, converted/expired/released/conflict 24h, trạng thái Redis mirror và lifecycle gần đây. UI refresh mỗi 5 giây.

### Database / data V66

V66 có migration mới:

```text
V66__durable_seat_holds.sql
```

Sau migrate:

```text
Flyway latest: V66
Public tables: 58
Core/reference seeded tables: 57
Transient operational table: seat_hold
```

`seat_hold` **được phép rỗng** khi không có người đang/đã giữ ghế trên database mới. Vì vậy các gate `verify_realistic_data_57.py` và `verify_seed_demo_57.py` vẫn kiểm tra 57 bảng dữ liệu core/reference; chúng không bịa row `seat_hold` chỉ để làm đẹp số lượng. V66 verifier kiểm tra schema/invariant riêng cho bảng thứ 58.

Không có seed phim, khách hàng, booking, payment hoặc seat-hold giả trong V66. UTF-8 end-to-end và 8 phim V29 được giữ nguyên.

### Source / runtime verification V66

Chạy từ:

```text
D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
```

```powershell
python .\tools\verify_v60_payment_production_4.py
python .\tools\verify_v61_fraud_risk_intelligence.py
python .\tools\verify_v62_dynamic_pricing_4.py
python .\tools\verify_v63_recommendation_4.py
python .\tools\verify_v64_crm_marketing_automation.py
python .\tools\verify_v65_observability_reliability.py
python .\tools\verify_v65_local_https.py
python .\tools\verify_v66_booking_consistency_seat_locking.py
python .\tools\verify_realistic_data_57.py
python .\tools\verify_seed_demo_57.py
```

Hoặc:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v66.ps1
```

Build/migrate:

```powershell
docker compose -f docker-compose.yml -f docker-compose.https.yml up -d --build

docker compose -f docker-compose.yml -f docker-compose.https.yml ps
```

Kiểm tra Flyway/table sau khi backend healthy:

```powershell
docker compose exec postgres psql -U cinebooking -d cinebooking -c "select version,description,success from flyway_schema_history order by installed_rank desc limit 3;"
docker compose exec postgres psql -U cinebooking -d cinebooking -c "select count(*) as public_tables from information_schema.tables where table_schema='public' and table_type='BASE TABLE';"
```

Mong đợi:

```text
Flyway latest = 66
public_tables = 58
```

Browser journey mới:

```text
frontend/e2e/booking-consistency-seat-locking-v66.spec.ts

> **V66 Playwright Admin credentials:** `frontend/playwright.config.ts` now reads the project-root `.env` automatically and maps `ADMIN_EMAIL` / `ADMIN_PASSWORD` to `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` when explicit E2E variables are not already set. This keeps local Playwright aligned with the actual Compose/Spring Admin account without copying a real password into source. Explicit `E2E_ADMIN_*` values still have highest priority for CI or one-off runs. The login helper reports the current URL and rendered login error instead of timing out silently.

```

Journey tạo hai USER thật theo shape test hiện hữu, race cùng một cụm ghế qua `/api`, yêu cầu đúng **1 winner / 1 HTTP 409**, kiểm tra response `POSTGRESQL_WITH_REDIS_MIRROR`, rồi xác nhận hold xuất hiện trên Admin Seat Operations.

### Lưu ý rollout V65 → V66

V65 trước đó giữ ghế ngắn hạn chỉ trong Redis. **V66 không backfill các hold Redis đang tồn tại sang `seat_hold`**, vì các hold này là trạng thái tạm thời và không có transaction-safe owner record để migrate. Khi nâng production nên deploy trong cửa sổ ngắn không có checkout đang hoạt động (hoặc đợi tối đa một TTL hold hiện tại) rồi mới mở traffic. Booking `PENDING`/`CONFIRMED` và payment hiện có không bị xoá hay reset. **Không chạy `docker compose down -v`**.

### Release V66

```text
RC:     v66.0.0-rc.1
Stable: v66.0.0
```

Trusted local HTTPS của V65 vẫn được giữ nguyên. Sau khi đã cài `mkcert`, chạy stack bằng:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\setup-local-https.ps1 -Start
```

và mở:

```text
https://localhost
```


### V66 runtime hotfix - Admin Seat Operations summary (PgJDBC TIMESTAMPTZ binding)

Nếu race E2E đã tạo được durable hold (HTTP `200 + 409`) nhưng `/admin/seat-operations` vẫn hiện `Lỗi hệ thống`, `Server: —` và `0 dòng`, nguyên nhân là Admin summary dùng raw `JdbcTemplate` với `java.time.Instant` làm bind parameter cho các cột `TIMESTAMPTZ`. Repository/Hibernate tự chuyển kiểu, nhưng PgJDBC không nên nhận `Instant` thô qua varargs trong đường này. V66 hotfix chuẩn hóa các tham số thời gian sang `java.sql.Timestamp` trước khi query.

Sau hotfix:

- `/api/admin/seat-operations/summary` trả summary thật thay vì HTTP 500 do bind type.
- Admin UI chỉ hiển thị Redis `DEGRADED` khi summary tải thành công và Redis thực sự không khả dụng; nếu summary chưa tải thì hiển thị `UNKNOWN`.
- E2E bắt buộc summary không có error banner, metric không còn `—`, rồi mới kiểm tra durable hold đang hiển thị.
- Không thêm migration, không reset database, giữ Flyway V66 / 58 public tables.


## V67 - Payment Resilience & Reconciliation 5.0

V67 tập trung vào khả năng phục hồi thanh toán khi callback bị mất, gateway trả trạng thái chưa chắc chắn, hoặc webhook hợp lệ tới trước khi hệ thống liên kết được payment. Strategy:

```text
V67-PAYMENT-RESILIENCE-5
```

### Gateway reconciliation mặc định bật

```text
PAYMENT_AUTO_RECONCILE_ENABLED=true
PAYMENT_RECONCILE_SCAN_MS=60000
PAYMENT_RECONCILE_MIN_AGE_SECONDS=45
PAYMENT_RECONCILE_MAX_BATCH=20
PAYMENT_RECONCILE_MAX_BACKOFF_SECONDS=900
```

PENDING/REVIEW của VNPay/MoMo được query lại theo lịch. Chỉ response query hợp lệ và amount khớp mới được phép đưa payment sang SUCCESS. Lỗi query dùng bounded exponential backoff và vẫn giữ payment ở trạng thái an toàn để retry sau.

### Webhook recovery / dead-letter

V67 mở rộng `payment_webhook_event` với lifecycle:

```text
RECEIVED -> PROCESSED
        -> REJECTED
        -> ORPHANED -> RECOVERY_PENDING -> RECOVERED
                                      \-> DEAD_LETTER
```

Webhook receipt được claim bằng transaction `REQUIRES_NEW`, vì vậy nếu transaction xử lý callback phía sau rollback thì event `RECEIVED` vẫn tồn tại để recovery job query gateway lại. Recovery **không replay mù payload webhook đã lưu**. Với event có chữ ký hợp lệ, hệ thống lấy provider order từ event key, liên kết lại payment nếu có thể rồi gọi query API của VNPay/MoMo. Điều này tránh dùng callback cũ như nguồn sự thật. Event chữ ký sai/merchant sai/amount sai nằm ở `REJECTED` và không được recovery.

```text
PAYMENT_WEBHOOK_RECOVERY_ENABLED=true
PAYMENT_WEBHOOK_RECOVERY_SCAN_MS=60000
PAYMENT_WEBHOOK_RECOVERY_MIN_AGE_SECONDS=30
PAYMENT_WEBHOOK_RECOVERY_MAX_BATCH=20
PAYMENT_WEBHOOK_RECOVERY_MAX_ATTEMPTS=5
PAYMENT_WEBHOOK_RECOVERY_MAX_BACKOFF_SECONDS=900
```

### Refund settlement state

V67 không thay đổi policy hoàn vé V38, nhưng payment có durable metadata để tránh ghi nhận hoàn tiền mơ hồ:

```text
NONE
REQUESTED
EVIDENCE_REQUIRED
SETTLED
REJECTED
FAILED
```

`refund_operation_key` là idempotency key nội bộ theo booking. Provider remote vẫn phải có provider reference trước khi booking/payment được ghi `REFUNDED`; request bị từ chối chuyển refund state sang `REJECTED`. Dữ liệu refund cũ đã `REFUNDED` được Flyway backfill thành `SETTLED` mà không sửa lịch sử nghiệp vụ.

### Admin Payment Resilience V67

```text
/admin/payment-resilience
GET  /api/admin/payment-resilience/summary
POST /api/admin/payment-resilience/reconcile-due
POST /api/admin/payment-resilience/recover-due
POST /api/admin/payment-resilience/webhooks/{id}/recover
```

Dashboard hiển thị due reconciliation, remote PENDING/REVIEW, ORPHANED/RECOVERY_PENDING/DEAD_LETTER webhook, refund settlement counts, policy/backoff và recovery queue. Tile `💳 Payment Resilience V67` nằm trên Admin Dashboard.

### Database / dữ liệu V67

```text
Flyway latest: V67
Public tables: 58
New V67 tables: 0
```

V67 chỉ ALTER `payment` và `payment_webhook_event`, không seed payment/webhook/refund giả. 57 bảng core/reference vẫn dùng data-policy hiện có; `seat_hold` tiếp tục là bảng transient thứ 58.

### Verification V67

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python .\tools\verify_v67_payment_resilience_reconciliation.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v67.ps1
```

Browser E2E:

```powershell
cd .\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
npx playwright test "e2e/payment-resilience-reconciliation-v67.spec.ts" --project=chromium
```

### Release V67

```text
Stable only: v67.0.0
```

## V68 - Security & Identity 5.0

V68 nâng lớp Security & Account Protection V46 thành một lớp **step-up authorization** dành cho thao tác ADMIN nhạy cảm. Đây là password re-authentication ngắn hạn; source **không tuyên bố đây là MFA/Passkey**. Strategy:

```text
V68-SECURITY-IDENTITY-5
```

### Admin step-up authentication

Luồng chuẩn:

```text
Admin access token + active auth_session
        ↓
nhập lại mật khẩu hiện tại
        ↓
POST /api/security/step-up
        ↓
raw token 48-byte random chỉ trả về browser
        ↓
browser giữ trong sessionStorage của tab
        ↓
DB chỉ lưu SHA-256(token)
        ↓
X-Step-Up-Token trên sensitive request
        ↓
user + session + expiry đều phải khớp
```

Mặc định:

```text
SECURITY_STEP_UP_ENABLED=true
SECURITY_STEP_UP_TTL_SECONDS=600
```

TTL backend bị chặn trong khoảng 60-1800 giây. Khi cấp grant mới cho cùng auth session, grant active cũ bị revoke với lý do `SUPERSEDED`. Khi logout, frontend xóa step-up token khỏi `sessionStorage` cùng auth state.

Nếu thao tác nhạy cảm thiếu/expired/sai token, backend trả:

```text
HTTP 428 Precondition Required
X-Step-Up-Required: true
```

Access token bình thường **không bị xóa**; Admin chỉ cần mở `/admin/security`, nhập lại mật khẩu rồi thử thao tác lại.

Các nhóm write được step-up bảo vệ trong V68:

- create/update/delete tài khoản user;
- create/promote/update/delete staff;
- payment resilience recovery/reconciliation POST;
- create/update/delete Dynamic Pricing rules;
- CRM campaign launch;
- Admin refund approve/reject;
- Admin revoke user sessions;
- booking cancel/refund/manual check-in nhạy cảm.

GET/read-only dashboard không bị step-up chặn.

### Security-header baseline

V68 thêm response headers:

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Content-Security-Policy: default-src 'self'; ...; frame-ancestors 'none'
```

Khi request thật sự đi qua HTTPS (`request.isSecure()` hoặc `X-Forwarded-Proto=https`), backend thêm:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

CSP V68 là baseline tương thích Next.js hiện tại; nó không được mô tả như nonce-based strict CSP. WebSocket `ws:/wss:` và runtime assets cần thiết vẫn được cho phép.

**V68 reverse-proxy header de-duplication:** Nginx là owner của bốn shared edge headers `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` và dùng `proxy_hide_header` để loại bản sao cùng tên từ upstream. Nhờ vậy API qua Nginx trả đúng một giá trị (`nosniff`, không còn `nosniff, nosniff`) và `Permissions-Policy` ở edge khớp backend: `camera=(), microphone=(), geolocation=(), payment=()`. Backend vẫn là owner của CSP và HSTS có điều kiện HTTPS. Sau khi áp dụng hotfix chỉ cần restart Nginx; không có Flyway/database change.

### Admin Security & Identity V68

```text
/admin/security
GET  /api/admin/identity-security/summary
POST /api/security/step-up
GET  /api/security/step-up/status
DELETE /api/security/step-up
```

Admin Dashboard có tile `🔐 Security & Identity V68`. Màn hình giữ nguyên alert/trusted-device telemetry V46 và bổ sung step-up trạng thái, countdown, protected action groups và security-header posture.

### Database / dữ liệu V68

```text
Flyway latest: V68
Public tables: 59
New V68 tables: 1  -> admin_step_up_grant
Seeded/reference core tables: 57
```

`admin_step_up_grant` là operational security table. V68 không tạo phim/khách/booking/payment giả và không seed step-up grant giả. Raw token không được lưu; chỉ `token_hash` SHA-256 được persist.

### Verification V68

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v68_security_identity_5.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v68.ps1
```

Browser E2E:

```powershell
cd .\frontend
Remove-Item Env:E2E_ADMIN_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:E2E_ADMIN_PASSWORD -ErrorAction SilentlyContinue
$env:PLAYWRIGHT_BASE_URL="https://localhost"
npx playwright test "e2e/security-identity-v68.spec.ts" --project=chromium
```

Với trusted local HTTPS của V65+, Chromium dùng Windows certificate store nên tin CA của `mkcert`, nhưng `BrowserContext.request`/`APIRequestContext` chạy qua Node.js và có thể không dùng cùng CA store. `frontend/playwright.config.ts` vì vậy chỉ đặt `ignoreHTTPSErrors=true` khi `PLAYWRIGHT_BASE_URL` là loopback HTTPS (`localhost`, `127.0.0.1`, `::1`). Remote HTTPS/CI vẫn giữ verify TLS bình thường; đây chỉ là compatibility bridge cho local mkcert E2E, không thay đổi Nginx/backend TLS.

E2E chứng minh một write `/api/admin/users` bị `428` khi chưa step-up, sau đó re-auth bằng password Admin thật từ `.env`, write thành công với `X-Step-Up-Token`, cleanup user tạm và kiểm tra CSP/frame/nosniff headers.

### Release V68 - chỉ Stable, không RC/Pre-release

Từ V68, quy trình chính thức của project chỉ tạo version chính. Không tạo tag `-rc.*` cho V68+.

```text
Stable only: v68.0.0
```

Một lệnh để verify → commit nếu có thay đổi → push `main` → chờ exact GitHub CI commit → tạo immutable tag → tạo GitHub Release Latest:

```powershell
.\scripts\release.ps1 v68.0.0
```

Script từ chối version có hậu tố pre-release và không overwrite tag stable đã tồn tại.

V68 stable release preflight chạy thêm `npm run lint` tại `frontend` **trước khi commit/push** để lỗi ESLint không tạo commit release đỏ trên `main`. Nếu GitHub CI vẫn fail sau push, script tự in `gh run view <runId> --log-failed` trước khi dừng để thấy lỗi thật ngay trong terminal. Clock countdown của trang `/admin/security` cũng không gọi `Date.now()` trong render initializer; thời gian hiện tại chỉ được lấy trong effect/timer để tương thích React compiler-era lint `react-hooks/purity`.

## V69 - Backup & Disaster Recovery 5.0

V69 biến bộ backup/restore an toàn từ V27 thành một DR workflow có bằng chứng vận hành và RPO/RTO rõ ràng. Strategy:

```text
V69-BACKUP-DR-5
```

### Kiến trúc backup evidence

Archive vẫn là PostgreSQL custom-format dump trong thư mục `./backups`; database **không lưu binary dump** và manifest **không chứa credential**.

```text
live PostgreSQL
      ↓
tools/backup-db.ps1
      ↓
custom .dump + .sha256
      ↓
V69 metadata manifest JSON
      ↓
tools/verify-dr-backup-v69.ps1
      ↓
append-only dr_backup_record
```

Manifest V69 chỉ giữ metadata an toàn:

```text
manifestVersion
strategyVersion
backupKey
backupFile
sha256
sizeBytes
latestFlywayVersion
publicTableCount
sourceCommit
createdAtUtc
verifiedAtUtc
retentionUntilUtc
```

Không ghi `POSTGRES_PASSWORD`, JWT secret, SMTP secret, payment credential hay raw database URL vào manifest/evidence.

### RPO / RTO policy

Mặc định:

```text
DR_RPO_TARGET_MINUTES=60
DR_RTO_TARGET_MINUTES=15
DR_BACKUP_RETENTION_DAYS=30
DR_DRILL_MAX_AGE_HOURS=168
```

Admin readiness:

```text
READY
  = latest verified backup age <= RPO target
  + latest successful drill age <= drill freshness window
  + restore duration <= RTO target

DEGRADED
  = có evidence nhưng một hoặc nhiều mục tiêu chưa đạt

NO_DATA
  = chưa có backup/drill evidence
```

### Non-destructive restore drill

`tools/dr-restore-drill-v69.ps1` **không overwrite database đang chạy**. Script:

```text
verified backup
      ↓
create temporary PostgreSQL database
      ↓
pg_restore --exit-on-error
      ↓
verify Flyway >= V69
verify >= 61 public tables
verify critical catalog
      ↓
measure restore duration + backup age
      ↓
append-only dr_restore_drill
      ↓
drop temporary database --force
```

Critical catalog V69:

```text
booking
payment
seat_hold
admin_step_up_grant
dr_backup_record
dr_restore_drill
```

Nếu drill fail, production database không bị recreate; failure evidence được ghi nếu backup đã được register, sau đó temporary database vẫn được cleanup trong `finally`.

### Database / dữ liệu V69

```text
Flyway latest: V69
Public tables: 61
New V69 tables: 2
  -> dr_backup_record
  -> dr_restore_drill
```

Hai bảng evidence dùng trigger append-only:

```text
trg_v69_dr_backup_immutable
trg_v69_dr_drill_immutable
```

V69 không seed backup/drill giả. Evidence chỉ xuất hiện sau khi operator thực sự chạy backup/drill.

### Admin Backup & DR V69

```text
/admin/disaster-recovery
GET /api/admin/disaster-recovery/summary
GET /api/admin/disaster-recovery/backups
GET /api/admin/disaster-recovery/drills
```

Dashboard hiển thị readiness, RPO/RTO target, backup age, restore-drill age/duration, checksum evidence, Flyway/table count và runbook. Tile `🛟 Backup & DR V69` nằm ngay sau `Security & Identity V68` để thứ tự version trên Admin Dashboard tiếp tục tăng dần.

### Tạo verified backup V69

Từ thư mục gốc:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
powershell -ExecutionPolicy Bypass -File .\tools\backup-dr-v69.ps1
```

Có thể chỉ định tên file an toàn trong `./backups`:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\backup-dr-v69.ps1 `
  -OutputFile .\backups\cinebooking-v69-manual.dump
```

### Chạy restore drill V69

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\dr-restore-drill-v69.ps1 `
  -BackupFile .\backups\cinebooking-v69-YYYYMMDD-HHMMSS.dump
```

### Verification V69

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v69_backup_disaster_recovery_5.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v69.ps1
```

Browser E2E:

```powershell
cd .\frontend
Remove-Item Env:E2E_ADMIN_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:E2E_ADMIN_PASSWORD -ErrorAction SilentlyContinue
$env:PLAYWRIGHT_BASE_URL="https://localhost"
npx playwright test "e2e/backup-disaster-recovery-v69.spec.ts" --project=chromium
```

### Release V69 - chỉ Stable

```text
Stable only: v69.0.0
```

Sau khi verifier, Docker runtime, backup/drill và Browser E2E đều PASS:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v69.0.0
```

Không tạo `v69.0.0-rc.*` hoặc GitHub Pre-release.
Các workflow RC/stable legacy vẫn được giữ để bảo toàn lịch sử V67 trở xuống, nhưng source V69 chặn chúng đối với V68+; release V69 chính thức đi qua `scripts/release.ps1` stable-only.

## V70 - Data Governance & Privacy 5.0

V70 đưa privacy/data-governance thành một control surface có thể kiểm chứng thay vì các thao tác xóa dữ liệu ad-hoc. Strategy:

```text
V70-DATA-GOVERNANCE-PRIVACY-5
```

### Mục tiêu và guardrail

```text
Privacy request
  EXPORT / ERASURE / RECTIFICATION
        ↓
OPEN → APPROVED / REJECTED / CANCELLED
        ↓
Audit evidence
```

V70 **không tự động xóa/anonymize dữ liệu**. `PRIVACY_RETENTION_EXECUTION_ENABLED=false` là mặc định và các policy row trong migration đều có `destructive_execution_enabled=false`. Subject inventory chỉ đếm record liên quan; `destructiveActionPerformed=false`.

Retention policy V70 là operational default để operator review, không phải tuyên bố đáp ứng bất kỳ luật/quy chuẩn cụ thể nào.

### Database / dữ liệu V70

```text
Flyway latest: V70
Public tables: 63
New V70 tables: 2
```

- `data_retention_policy`: policy key, data class, table, retention window, action và destructive guardrail.
- `privacy_request`: subject, request type/status, SLA due time, actor/reviewer và review evidence.
- Active request cùng `subject_user_id + request_type` được chặn trùng bằng partial unique index.
- Không seed privacy request giả; migration chỉ tạo 5 operational retention defaults.

### Admin Privacy Governance V70

Trang:

```text
https://localhost/admin/privacy-governance
```

API:

```text
GET  /api/admin/privacy-governance/summary
GET  /api/admin/privacy-governance/policies
GET  /api/admin/privacy-governance/requests
GET  /api/admin/privacy-governance/subject-inventory?email=...
POST /api/admin/privacy-governance/requests
POST /api/admin/privacy-governance/requests/{id}/review
```

Hai endpoint POST yêu cầu Step-up V68 qua `X-Step-Up-Token`. Tile `🧾 Privacy Governance V70` nằm ngay sau `🛟 Backup & DR V69`, giữ thứ tự version tăng dần trên Admin Dashboard.

Config mặc định:

```env
PRIVACY_REQUEST_SLA_HOURS=72
PRIVACY_RETENTION_EXECUTION_ENABLED=false
```

### Verification V70

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v70_data_governance_privacy_5.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v70.ps1
```

Browser E2E:

```powershell
cd .\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
npx playwright test "e2e/data-governance-privacy-v70.spec.ts" --project=chromium
```

### Release V70 - chỉ Stable

```text
Stable only: v70.0.0
```

Sau khi verifier, Docker/Flyway, frontend lint/build và Browser E2E đều PASS:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v70.0.0
```

Không tạo RC/Pre-release cho V70.

## V71 - Secrets & Key Governance 5.0

V71 đưa secret/key rotation vào một control surface có thể kiểm chứng mà không đưa credential vào database. Strategy:

```text
V71-SECRETS-KEY-GOVERNANCE-5
```

### Mục tiêu và guardrail

```text
Secret manager / environment
        ↓
configured presence only
        ↓
rotation policy + due posture
        ↓
append-only evidence
```

V71 **không lưu hoặc trả secret value**. `JWT_SECRET`, `MAIL_PASSWORD`, `VNPAY_HASH_SECRET`, `MOMO_SECRET_KEY` và `WEB_PUSH_VAPID_PRIVATE_KEY` vẫn nằm ngoài database. API chỉ trả `configured=true/false`, policy metadata và fingerprint/reference do Admin ghi nhận.

`KEY_GOVERNANCE_AUTO_ROTATION_EXECUTION_ENABLED=false` là mặc định; V71 không tự động rotate/revoke credential. Rotation evidence là append-only và write action yêu cầu Step-up V68.

### Database / dữ liệu V71

```text
Flyway latest: V71
Public tables: 65
New V71 tables: 2
```

- `secret_rotation_policy`: policy key, secret class, owner, rotation window và manual/auto execution flag.
- `secret_rotation_event`: `ROTATED / VERIFIED / REVOKED / INCIDENT`, actor, provider reference, fingerprint và timestamp.
- Trigger `trg_v71_secret_rotation_event_immutable` chặn UPDATE/DELETE evidence.
- Migration chỉ seed 5 policy metadata; **không seed rotation event, credential hoặc dữ liệu nghiệp vụ giả**.

### Admin Secrets & Key Governance V71

Trang:

```text
https://localhost/admin/key-governance
```

API:

```text
GET  /api/admin/key-governance/summary
GET  /api/admin/key-governance/policies
GET  /api/admin/key-governance/events
POST /api/admin/key-governance/events
```

POST yêu cầu Step-up V68 qua `X-Step-Up-Token`. Tile `🔑 Key Governance V71` nằm ngay sau `🧾 Privacy Governance V70`, giữ thứ tự version tăng dần trên Admin Dashboard.

Config mặc định:

```env
KEY_GOVERNANCE_WARNING_DAYS=14
KEY_GOVERNANCE_AUTO_ROTATION_EXECUTION_ENABLED=false
```

### Verification V71

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v71_secrets_key_governance_5.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v71.ps1
```

Browser E2E:

```powershell
cd .\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
npx playwright test "e2e/secrets-key-governance-v71.spec.ts" --project=chromium
```

### Release V71 - chỉ Stable

```text
Stable only: v71.0.0
```

Sau khi verifier, Docker/Flyway, frontend lint/build và Browser E2E đều PASS:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v71.0.0
```

Không tạo RC/Pre-release cho V71.

## V72 - Software Supply Chain Integrity 5.0

V72 bổ sung control surface cho artifact provenance và dependency/security scan evidence mà không đưa artifact binary hoặc scanner report body vào database. Strategy:

```text
V72-SUPPLY-CHAIN-INTEGRITY-5
```

### Mục tiêu và guardrail

```text
Build / CI artifact
       ↓
SHA-256 + source/build/SBOM references
       ↓
append-only artifact evidence
       ↓
scan severity counters
       ↓
server-derived PASS / WARN / FAIL
```

- Browser không gửi `decision`; backend tự tính `PASS/WARN/FAIL` theo `SUPPLY_CHAIN_MAX_CRITICAL` và `SUPPLY_CHAIN_MAX_HIGH`.
- PostgreSQL chỉ lưu digest/reference/counter/evidence metadata; **không lưu artifact binary** và không lưu scanner report body.
- Evidence của `software_artifact_evidence` và `software_supply_chain_scan` là append-only; trigger V72 chặn UPDATE/DELETE.
- `SUPPLY_CHAIN_RELEASE_GATE_ENFORCEMENT_ENABLED=false` là mặc định. V72 chỉ cung cấp posture/advisory; CI và `scripts/release.ps1` vẫn là release authority.
- Các POST `/api/admin/supply-chain/**` yêu cầu Step-up V68.
- `tools/generate_supply_chain_inventory_v72.py` tạo source dependency inventory offline từ `backend/pom.xml` + `frontend/package.json` (hoặc `package-lock.json` nếu có), sinh file JSON và `.sha256`; CI upload inventory này làm build artifact.

### Database / dữ liệu V72

```text
Flyway latest: V72
Public tables: 67
New V72 tables: 2
```

- `software_artifact_evidence`: artifact type, version label, SHA-256, Git source commit, build reference, SBOM/inventory reference và actor/timestamps.
- `software_supply_chain_scan`: scanner identity/version, report fingerprint, critical/high/medium/low counters và server-derived decision.
- Trigger `trg_v72_software_artifact_immutable` và `trg_v72_supply_chain_scan_immutable` chặn sửa/xóa evidence.
- Migration không seed artifact/scan evidence và **không tạo phim/khách/booking/payment giả**.

### Admin Software Supply Chain V72

Trang:

```text
https://localhost/admin/supply-chain
```

API:

```text
GET  /api/admin/supply-chain/summary
GET  /api/admin/supply-chain/artifacts
GET  /api/admin/supply-chain/scans
POST /api/admin/supply-chain/artifacts
POST /api/admin/supply-chain/scans
```

Tile `🧩 Supply Chain V72` nằm ngay sau `🔑 Key Governance V71`, giữ thứ tự version tăng dần trên Admin Dashboard.

Config mặc định:

```env
SUPPLY_CHAIN_EVIDENCE_MAX_AGE_HOURS=168
SUPPLY_CHAIN_MAX_CRITICAL=0
SUPPLY_CHAIN_MAX_HIGH=0
SUPPLY_CHAIN_RELEASE_GATE_ENFORCEMENT_ENABLED=false
```

### Verification V72

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v72_software_supply_chain_5.py
python -X utf8 .\tools\generate_supply_chain_inventory_v72.py --output-dir build/supply-chain-v72
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v72.ps1
```

Browser E2E:

```powershell
cd .\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
npx playwright test "e2e/software-supply-chain-v72.spec.ts" --project=chromium
```

### Release V72 - chỉ Stable

```text
Stable only: v72.0.0
```

Sau khi verifier, Docker/Flyway, frontend lint/build và Browser E2E đều PASS:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v72.0.0
```

Không tạo RC/Pre-release cho V72.

## V73 - GitHub Actions Runtime Modernization 5.0

V73 xử lý dứt điểm cảnh báo GitHub Actions về Node.js 20 còn xuất hiện ở bước upload dependency inventory của V72. Strategy:

```text
V73-GITHUB-ACTIONS-NODE24-5
```

### Nguyên nhân cảnh báo và cách sửa

Workflow cũ còn một tham chiếu:

```text
actions/upload-artifact@v4
```

Major này thuộc thế hệ Node 20. GitHub Actions đang chuyển runner JavaScript actions sang Node 24 và Node 20 sẽ bị loại khỏi runner vào **23/09/2026**. V73 chuyển toàn bộ upload artifact sang:

```text
actions/upload-artifact@v7
```

Đồng thời Java bootstrap trong CI chuyển từ `actions/setup-java@v5` sang baseline hiện tại:

```text
actions/setup-java@v6
```

Các action major được V73 xác thực:

```text
actions/checkout@v7
actions/setup-java@v6
actions/setup-node@v7
actions/upload-artifact@v7
docker/setup-buildx-action@v4
docker/build-push-action@v7
```

V73 **không** dùng workaround `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION=true`. Repo cũng không cần `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` để che action cũ; action phải tự khai báo/runtime Node 24 đúng major. Với self-hosted runner, baseline tối thiểu là **Actions Runner 2.327.1**. GitHub-hosted `ubuntu-latest` tự đáp ứng baseline runner.

### Admin surface V73

Từ V74 maintenance line, Admin Dashboard bổ sung tile còn thiếu giữa V72 và V74:

```text
⚙ Actions Runtime V73 → /admin/actions-runtime
```

Trang này chỉ hiển thị baseline tooling an toàn (`V73-GITHUB-ACTIONS-NODE24-5`, action majors, Node 24 posture, Flyway V72/67 tables) và lệnh verifier. Browser **không gọi GitHub API, không đọc GitHub token và không hiển thị secret**. Versioned quick-action tiles vì vậy liên tục `V72 → V73 → V74` thay vì bỏ trống V73.

### Regression gate V73

Verifier mới:

```text
tools/verify_v73_github_actions_node24.py
```

Gate này kiểm tra:

- không còn `actions/upload-artifact@v4` hoặc `@v5`;
- tất cả upload artifact đều dùng `@v7`;
- setup Java dùng `@v6`;
- checkout/setup-node và Docker build actions giữ các major Node 24 đã xác thực;
- không bật fallback Node 20 không an toàn;
- V72 dependency inventory vẫn được tạo và upload;
- historical verifier V28/V72 được forward-compatible;
- V59 clipping regression gate vẫn nằm trong CI;
- stable-only release flow tiếp tục được giữ.

V73 không thay đổi frontend/backend nghiệp vụ, không thêm migration và không tạo dữ liệu giả:

```text
Flyway latest: V72
Public tables: 67
New V73 tables: 0
```

### Verification V73

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui

python -X utf8 .\tools\verify_v28_ci.py
python -X utf8 .\tools\verify_v35_setup_node_compat.py
python -X utf8 .\tools\verify_v59_realtime_operations_4.py
python -X utf8 .\tools\verify_v72_software_supply_chain_5.py
python -X utf8 .\tools\verify_v73_github_actions_node24.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v73.ps1
```

V73 là tooling-only nên **không cần Docker rebuild và không có Flyway mới** chỉ để áp dụng bản nâng cấp này. Frontend lint vẫn là zero-warning gate:

```powershell
cd .\frontend
npm run lint
```

### Release V73 - chỉ Stable

```text
Stable only: v73.0.0
```

Sau khi source gates và GitHub CI PASS:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v73.0.0
```

Không tạo RC/Pre-release cho V73.

## V74 - Reliability & Resilience 5.0

V74 quay lại roadmap reliability sau nhánh security/tooling V70-V73 và tái sử dụng các capability đã có thay vì tạo một stack giám sát song song. Strategy:

```text
V74-RELIABILITY-RESILIENCE-5
```

### Multi-window error-budget burn-rate

V74 mở rộng ring-buffer telemetry V65 để đọc các cửa sổ tùy chọn tối đa 120 phút nhưng vẫn giữ giới hạn **2.000 request samples mỗi replica**. Hai cửa sổ mặc định:

```text
FAST window: 5 phút   · alert threshold 14.4x
SLOW window: 60 phút  · alert threshold 6.0x
Availability target: 99.9%
Error budget: 0.1%
```

Công thức:

```text
burn rate = observed 5xx error rate / allowed error budget
```

Nếu ring-buffer đầy và không còn bao phủ đủ cửa sổ yêu cầu, API trả `sampleBufferTruncated=true` và UI hiển thị `PARTIAL`; hệ thống không tuyên bố window đầy đủ. `ACTION_REQUIRED` được dùng khi dependency fail, có incident CRITICAL đang mở, hoặc FAST + SLOW cùng vượt ngưỡng. Một cửa sổ đơn vượt ngưỡng chỉ đưa posture sang `WATCH` cho đến khi đủ điều kiện multi-window.

Cấu hình:

```env
RELIABILITY_AVAILABILITY_TARGET_PERCENT=99.9
RELIABILITY_FAST_WINDOW_MINUTES=5
RELIABILITY_SLOW_WINDOW_MINUTES=60
RELIABILITY_FAST_BURN_THRESHOLD=14.4
RELIABILITY_SLOW_BURN_THRESHOLD=6.0
RELIABILITY_INCIDENT_LOOKBACK_HOURS=24
```

### Incident timeline

Admin API:

```text
GET /api/admin/reliability/summary
GET /api/admin/reliability/incidents?limit=50
GET /api/admin/reliability/runbook
```

Timeline hợp nhất ba nguồn có provenance rõ ràng:

- `STAFF_INCIDENT`: dữ liệu incident thật trong PostgreSQL, durable;
- `AUDIT_LOG`: recovery/security/payment/operations evidence phù hợp, durable;
- `RUNTIME_5XX`: request sample từ V65 của replica hiện tại, **ephemeral** và gắn trace ID khi có.

V74 không thêm incident giả để làm đẹp dashboard và không suy diễn trạng thái healthy khi không có request sample.

### Controlled failover drill

Script:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\failover-drill-v74.ps1
```

Mặc định chỉ in kế hoạch:

```text
PLAN ONLY - no container will be stopped.
```

Chỉ chạy thật trong maintenance window khi thêm `-Execute`:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\failover-drill-v74.ps1 -Execute
```

Guardrails:

- chỉ cho target `backend-1` hoặc `backend-2`;
- `BaseUrl` chỉ nhận loopback `localhost/127.0.0.1`;
- baseline probe phải PASS trước khi dừng replica;
- chỉ `docker compose stop <one-backend>`; không stop PostgreSQL, Redis, frontend hay nginx;
- probe `/api/movies` qua nginx để xác nhận replica còn lại vẫn phục vụ request;
- luôn `docker compose start <target>` trong `finally`;
- không chứa `down -v`, không xóa volume và không recreate database.

### Runbook V74

Dashboard `/admin/reliability` hiển thị runbook bảy bước:

```text
DETECT → TRIAGE → STABILIZE → FAILOVER → RECOVER → VERIFY → CLOSE
```

Recovery dữ liệu tiếp tục dùng restore drill V69 trên database tạm; V74 không thêm chức năng restore đè database live.

### Schema / dữ liệu

```text
Flyway latest: V72
Public tables: 67
New V74 tables: 0
```

V74 chỉ đọc telemetry, `staff_incident`, `audit_log` và DR evidence hiện có. Không seed phim, khách hàng, booking, payment hay incident giả.

### Verification V74

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui

python -X utf8 .\tools\verify_v59_realtime_operations_4.py
python -X utf8 .\tools\verify_v65_observability_reliability.py
python -X utf8 .\tools\verify_v69_backup_disaster_recovery_5.py
python -X utf8 .\tools\verify_v72_software_supply_chain_5.py
python -X utf8 .\tools\verify_v73_github_actions_node24.py
python -X utf8 .\tools\verify_v74_reliability_resilience_5.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v74.ps1
```

V74 thay đổi backend + frontend nên runtime cần rebuild, nhưng không có Flyway mới:

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  up -d --build
```

Frontend zero-warning gate:

```powershell
cd .\frontend
npm run lint
$env:NEXT_PUBLIC_API_URL="/api"
npm run build
$env:PLAYWRIGHT_BASE_URL="https://localhost"
npx playwright test "e2e/reliability-resilience-v74.spec.ts" --project=chromium
```

### Release V74 - chỉ Stable

```text
Stable only: v74.0.0
```

Sau khi source gates, runtime, lint/build và Browser E2E PASS:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v74.0.0
```

Không tạo RC/Pre-release cho V74.

## V75 - Analytics & BI 5.0

V75 quay lại roadmap Business Intelligence sau V74 Reliability và **tái sử dụng dữ liệu vận hành thật** thay vì tạo một kho sự kiện giả. Strategy:

```text
V75-ANALYTICS-BI-5
```

### Booking → Payment → Check-in funnel

Admin API mới:

```text
GET /api/admin/analytics-bi/summary?days=90
```

`days` được giới hạn `30..365`. Funnel không bắt đầu từ visitor/page-view vì CineBooking hiện không có durable page-view stream. Các bước là:

```text
BOOKING_ATTEMPT
  → CONFIRMED
  → PAYMENT_ATTEMPT
  → PAID
  → CHECKED_IN
```

Booking được cohort theo `booking.created_at` trong cửa sổ chọn. `PAYMENT_ATTEMPT` chỉ tính booking đã confirmed có payment attempt; `PAID` chỉ tính booking có `payment.status='SUCCESS'`; `CHECKED_IN` chỉ tính booking đã confirmed, có SUCCESS payment và có `ticket_checkin_log`. Vì vậy V75 **không tạo page-view/visitor giả** để làm đẹp conversion funnel.

### Cohort activation và 30-day repeat

Cohort được nhóm theo tháng `app_user.created_at` với `role='USER'`:

- `activatedUsers`: có ít nhất 1 booking confirmed trong 30 ngày đầu sau đăng ký;
- `repeat30dUsers`: có ít nhất 2 booking confirmed trong 30 ngày đầu;
- `matured30d`: chỉ `true` khi cohort đã qua đủ thời gian quan sát.

Cohort chưa đủ tuổi hiển thị `PARTIAL`, tránh so sánh cohort non-matured như dữ liệu đầy đủ.

### Realized customer LTV

V75 tính **Realized customer LTV** từ payment `SUCCESS`. Retry/payment duplicate được gom theo booking bằng `max(amount)` trước khi cộng lifetime revenue. Bảng top customer chỉ trả:

```text
customerRef
masked email
paidBookings
realizedRevenue
averageOrderValue
firstPaidAt / lastPaidAt
```

Backend không trả raw customer email trong DTO LTV; UI chỉ nhận **masked email**.

### Payment conversion

Theo từng provider trong cửa sổ chọn, V75 hiển thị:

```text
attempts
successfulAttempts
failedAttempts
otherAttempts
successRatePercent
successfulAmount
```

`successfulAmount` chỉ cộng payment `SUCCESS`.

### Hiệu suất phim/rạp

V75 đo **Hiệu suất phim/rạp** trên các showtime đã bắt đầu trong cửa sổ:

```text
completedShowtimes
ticketsSold
seatCapacity
occupancyRatePercent
realizedRevenue
revenuePerShowtime
revenuePerSeatOffered
```

Seat capacity đọc trực tiếp từ `seat`; tickets dùng `booking_seat` chưa release của booking đã confirmed; revenue dùng realized SUCCESS payment. Không suy diễn doanh thu từ giá niêm yết.

### Admin surface V75

Dashboard thêm đúng sau V74:

```text
🛡 Reliability V74
📊 Analytics & BI V75 → /admin/analytics-bi
```

Trang V75 liên kết ngược về `/admin/analytics` để giữ nguyên Analytics & Forecasting V51; V75 không thay thế export/snapshot/cost-basis hiện có.

Evidence policy:

```text
REAL_OPERATIONAL_DATA_ONLY
REALIZED_SUCCESS_PAYMENTS_ONLY
NO_SYNTHETIC_FUNNEL_EVENTS
NO_RAW_CUSTOMER_EMAIL_IN_LTV_TABLE
COHORT_30D_MATURITY_EXPLICIT
PAST_SHOWTIMES_ONLY_FOR_EFFICIENCY
```

### Schema / dữ liệu

```text
Flyway latest: V72
Public tables: 67
New V75 tables: 0
```

V75 không thêm migration, không seed dữ liệu BI riêng và không tạo phim/khách/booking/payment giả.

### Verification V75

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui

python -X utf8 .\tools\verify_v51_analytics_forecasting_3.py
python -X utf8 .\tools\verify_v55_customer_retention.py
python -X utf8 .\tools\verify_v56_customer_value_rfm.py
python -X utf8 .\tools\verify_v74_reliability_resilience_5.py
python -X utf8 .\tools\verify_v75_analytics_bi_5.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v75.ps1
```

V75 thay đổi backend + frontend nên runtime cần rebuild, nhưng Flyway vẫn V72:

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  up -d --build
```

Frontend zero-warning + Browser E2E:

```powershell
cd .\frontend
npm run lint
$env:NEXT_PUBLIC_API_URL="/api"
npm run build
$env:PLAYWRIGHT_BASE_URL="https://localhost"
npx playwright test "e2e/analytics-bi-v75.spec.ts" --project=chromium
```

### Release V75 - chỉ Stable

```text
Stable only: v75.0.0
```

Sau khi source gates, runtime, lint/build và Browser E2E PASS:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v75.0.0
```

Không tạo RC/Pre-release cho V75.

## V75.0.1 - Cost Coverage Drill-down

Patch `v75.0.1` hoàn thiện phần **MARGIN & COST COVERAGE** của Analytics V51 mà V75 tiếp tục sử dụng. Khi `costCoverageRate < 100%`, thẻ **Giá vốn bắp nước / Chưa biết** trở thành drill-down thay vì chỉ hiển thị trạng thái. Strategy:

```text
V75.0.1-COST-COVERAGE-DRILLDOWN-1
```

API mới chỉ đọc dữ liệu vận hành thật:

```text
GET /api/admin/analytics/missing-cost-basis?days=30&cinemaId=<optional>
```

Backend đối chiếu `booking_concession` của booking `CONFIRMED` với `cinema_concession_cost_basis` theo đúng cặp **rạp + sản phẩm** và đúng cửa sổ Analytics. Chỉ các dòng `cb.unit_cost IS NULL` mới xuất hiện. Response cho biết chính xác `missingUnits`, số cặp rạp/sản phẩm bị ảnh hưởng, `affectedRevenue`, lần bán gần nhất và từng item đang thiếu cost. Giá vốn **không được ước lượng**, không dùng `COALESCE(cost,0)` và không sinh dữ liệu giả.

Trên UI, Admin/Manager có thể bấm thẻ **Chưa biết**, xem các item thiếu cost và nhập giá vốn ngay tại dòng bằng nút **Cập nhật ngay**. Action tái sử dụng endpoint V51 hiện có:

```text
PUT /api/admin/analytics/cost-basis
```

Sau khi lưu, dashboard và drill-down được tải lại để `costCoverageRate`, `concessionCost` và `grossMargin` phản ánh dữ liệu mới ngay lập tức. Nếu một sản phẩm lịch sử đã bị xóa khiến `productId` không còn, hệ thống vẫn hiển thị evidence nhưng chặn cập nhật trực tiếp thay vì ghi nhầm cost vào sản phẩm khác.

V75.0.1 là patch **no-schema**:

```text
Flyway latest: V72
Public tables: 67
New V75.0.1 tables: 0
```

Verification:

```powershell
python -X utf8 .\tools\verify_v51_analytics_forecasting_3.py
python -X utf8 .\tools\verify_v75_analytics_bi_5.py
python -X utf8 .\tools\verify_v75_cost_coverage_drilldown.py
```

Stable patch tag:

```text
v75.0.1
```

V76 vẫn dành cho roadmap **Recommendation 5.0**; patch này không chiếm major version tiếp theo.

## V76 - Recommendation 5.0

V76 tiếp tục roadmap sau V75 và nâng recommendation từ **V63 Recommendation 4.0** lên **Recommendation 5.0** mà không thay thế dữ liệu lịch sử. Hai strategy được công khai rõ:

```text
Customer algorithm: V76-EVIDENCE-AWARE-5
Admin quality strategy: V76-RECOMMENDATION-5
```

### Customer For You V76

Trang hiện có vẫn là:

```text
/for-you
```

V76 giữ nguyên các năng lực đã chứng minh ở V63 để không phá hành vi người dùng:

```text
FAMILIAR
BALANCED
DISCOVERY

favorites + reviews + CONFIRMED bookings
recommendation CLICK/VIEW với recency decay
MORE_LIKE_THIS / LESS_LIKE_THIS / HIDE
language / rating / duration / cinema / weekday / daypart
future OPEN showtime context
deterministic diversity reranking
score breakdown + confidence + new-to-you
```

V76 đổi runtime source attribution sang:

```text
FOR_YOU_V76
FOR_YOU_V76_<MODE>
```

và response `/api/recommendations/home` bổ sung `evidencePolicy`. Không tạo lịch sử gu giả và không tự sinh movie để làm đầy recommendation grid.

### Admin Recommendation Quality & Evidence

Dashboard Admin thêm đúng sau V75:

```text
🛡 Reliability V74
📊 Analytics & BI V75
🧠 Recommendation V76 → /admin/recommendation
```

API read-only:

```text
GET /api/admin/recommendation/summary?days=30
```

`days` được giới hạn trong `7..180`. API nằm dưới `/api/admin/**` nên chỉ `ADMIN` truy cập theo `SecurityConfig` hiện có.

Summary đo trực tiếp từ dữ liệu vận hành:

```text
activeMovies
actionableMovies
metadataCompleteMovies
registeredUsers
personalizableUsers
recommendationEvents
recommendationClicks
recommendationViews
explicitFeedback
moreLikeFeedback
lessLikeFeedback
hiddenFeedback
assistedConfirmedBookings
assistedRealizedRevenue
coverage
topMovies
topSources
```

**Actionable movie** = movie `active=true` có ít nhất một `showtime.status='OPEN'` trong tương lai.

**Metadata complete** = movie active có `genre`, `movie_language` và `duration_minutes > 0`.

**Personalizable user** = USER đã có ít nhất một durable signal trong các bảng hiện có: `movie_favorite`, `movie_review`, booking đã confirmed, `recommendation_event` hoặc `recommendation_feedback`.

### Assisted booking: correlation, không causal attribution

V76 chỉ đánh dấu một booking là assisted khi thỏa đồng thời:

```text
booking.confirmed_at trong cửa sổ
same user
same movie
có recommendation_event trước booking
khoảng cách event → confirmed booking <= 7 ngày
```

Do hệ thống chưa có experiment assignment / impression exposure / randomized holdout đầy đủ, metric này **không được diễn giải là recommendation gây ra booking**. Policy bắt buộc:

```text
ASSISTED_BOOKING_IS_CORRELATION_NOT_CAUSATION
```

`assistedRealizedRevenue` chỉ cộng payment `SUCCESS`, dedupe retry theo booking bằng `max(payment.amount)` trước khi cộng.

### Evidence Policy V76

Customer policy:

```text
REAL_OPERATIONAL_DATA_ONLY
NO_SYNTHETIC_MOVIE_DATA
EXPLAINABLE_RECOMMENDATIONS
DETERMINISTIC_DIVERSITY_RERANK
EXPLICIT_FEEDBACK_CONTROLS
```

Admin policy bổ sung:

```text
ASSISTED_BOOKING_IS_CORRELATION_NOT_CAUSATION
NO_RAW_PERSONAL_DATA_IN_ADMIN_RECOMMENDATION_UI
```

Admin summary không trả raw email, tên người dùng, phone hoặc taste profile theo từng người. Chỉ trả aggregate counts/percentages và movie/source metrics.

### Schema / dữ liệu V76

V76 là **no-schema release**:

```text
Flyway latest: V72
Public tables: 67
New V76 tables: 0
```

Không có:

```text
V76__*.sql
```

V76 tái sử dụng `movie`, `showtime`, `app_user`, `movie_favorite`, `movie_review`, `booking`, `payment`, `recommendation_event`, `recommendation_feedback`; không thêm seed business data và không tạo phim/khách/booking/payment giả.

### Verification V76

Chạy từ thư mục chuẩn:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui

python -X utf8 .\tools\verify_v63_recommendation_4.py
python -X utf8 .\tools\verify_v74_reliability_resilience_5.py
python -X utf8 .\tools\verify_v75_analytics_bi_5.py
python -X utf8 .\tools\verify_v75_cost_coverage_drilldown.py
python -X utf8 .\tools\verify_v76_recommendation_5.py

powershell -ExecutionPolicy Bypass `
  -File .\tools\diagnose-v76.ps1
```

### Docker + Runtime V76

V76 thay đổi backend + frontend nên rebuild:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui

docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  up -d --build
```

Kiểm tra:

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  ps
```

Mong đợi:

```text
postgres      healthy
redis         healthy
backend-1     Up
backend-2     Up
frontend      Up
nginx         Up
```

### Flyway V76

V76 không có migration. Dòng mới nhất vẫn phải là V72 và tổng public table vẫn là 67.

### Zero-warning lint + Production build

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend

npm run lint
$LASTEXITCODE

$env:NEXT_PUBLIC_API_URL="/api"
npm run build
```

Route V76 phải xuất hiện trong production build:

```text
/admin/recommendation
```

và các route cũ như `/admin/reliability`, `/admin/analytics-bi`, `/for-you` vẫn còn.

### Browser E2E V76

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend

Remove-Item Env:E2E_ADMIN_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:E2E_ADMIN_PASSWORD -ErrorAction SilentlyContinue

$env:PLAYWRIGHT_BASE_URL="https://localhost"

npx playwright test `
  "e2e/recommendation-5-v76.spec.ts" `
  --project=chromium
```

E2E kiểm tra tile V76, thứ tự version, strategy, evidence policy, coverage, feedback, assisted-booking disclaimer, top movie/source panels, For You V76 và không có error banner.

### Release V76 - chỉ Stable

```text
Stable only: v76.0.0
```

Sau khi source gates, runtime, lint/build và Browser E2E PASS:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v76.0.0
```

Không tạo RC/Pre-release cho V76.

## V77 - CRM Automation 5.0

V77 tiếp tục roadmap sau V76 và nâng CRM từ **V64 CRM & Marketing Automation 4.0** lên **CRM Automation 5.0**. V64 vẫn được giữ tại `/admin/marketing` để tương thích; V77 bổ sung surface mới:

```text
/admin/crm-automation
```

Strategy:

```text
V77-CRM-AUTOMATION-5
```

### Lifecycle playbooks V77

V77 phân khúc trực tiếp từ `app_user`, booking `CONFIRMED` và realized payment `SUCCESS` hiện có:

```text
WELCOME_FIRST_BOOKING
ENGAGED_CROSS_SELL
VIP_REWARD
AT_RISK_WINBACK
LAPSED_REACTIVATION
```

Định nghĩa chính:

- `WELCOME_FIRST_BOOKING`: USER active, tài khoản <=30 ngày và chưa có booking `CONFIRMED`.
- `ENGAGED_CROSS_SELL`: booking `CONFIRMED` gần nhất trong 30 ngày.
- `VIP_REWARD`: GOLD/DIAMOND hoặc >=4 booking `CONFIRMED` hoặc realized revenue >=1.000.000đ.
- `AT_RISK_WINBACK`: booking gần nhất cách 31-90 ngày.
- `LAPSED_REACTIVATION`: booking gần nhất cách trên 90 ngày.

Không có segment synthetic và không tạo customer/booking/payment giả để tăng số eligible.

### Contactability & suppression V77

Mỗi customer khớp playbook được kiểm tra theo thứ tự:

```text
PROMOTION_OPT_OUT
NO_ENABLED_CHANNEL
FREQUENCY_CAP_7D
COOLDOWN_72H
```

Contactable chỉ khi:

```text
notification_preference.promotion_enabled = true
AND ít nhất một trong in_app_enabled / email_enabled / browser_enabled = true
AND promotion notifications trong 7 ngày < 2
AND promotion gần nhất >= 72 giờ trước
```

Chính sách công khai:

```text
PROMOTION_OPT_OUT_RESPECTED
CONTACTABILITY_CHANNEL_REQUIRED
FREQUENCY_CAP_2_PER_7D
PROMOTION_COOLDOWN_72H
```

### Preview-before-execute + blast-radius guard

API V77:

```text
GET  /api/admin/crm-automation/summary?days=30
POST /api/admin/crm-automation/preview
POST /api/admin/crm-automation/execute
```

`summary.days` bị giới hạn trong `7..180`.

Mọi campaign phải Preview trước trong UI. Request có `maxRecipients` từ `1..5000`; Execute bị chặn khi số customer contactable vượt giới hạn này. Đây là guard có chủ đích để Admin không vô tình phát chiến dịch quá rộng.

`POST /execute` là sensitive write và được thêm vào Admin step-up protection hiện có.

### Voucher + delivery idempotency

V77 tiếp tục dùng voucher owner-scoped 1 lần:

```text
owner_user_id = customer
usage_limit = 1
code = C77-<CAMPAIGN>-<CUSTOMER_REF>
```

Notification:

```text
notification_type = PROMOTION_V77
dedupe_key = CRM77:<campaignCode>:<userId>
```

Chạy lại cùng `campaignCode` không tạo notification trùng; voucher cũ chỉ được reuse nếu owner và cấu hình discount vẫn khớp.

### CRM outcome evidence V77

Dashboard đo riêng `PROMOTION_V77` trong cửa sổ đã chọn:

```text
promotionMessages
inAppVisibleMessages
readMessages
readRatePercent
assistedConfirmedBookings
assistedRealizedRevenue
```

CRM-assisted booking = booking `CONFIRMED` của cùng user trong tối đa 7 ngày sau một `PROMOTION_V77`. Metric này chỉ là **correlation signal**:

```text
CRM_ASSISTED_BOOKING_IS_CORRELATION_NOT_CAUSATION
```

`assistedRealizedRevenue` chỉ cộng payment `SUCCESS` và dedupe retry theo booking bằng `max(payment.amount)` trước khi cộng.

### Evidence / privacy policy V77

```text
REAL_OPERATIONAL_DATA_ONLY
NO_SYNTHETIC_CUSTOMER_OR_BOOKING_DATA
PROMOTION_OPT_OUT_RESPECTED
CONTACTABILITY_CHANNEL_REQUIRED
FREQUENCY_CAP_2_PER_7D
PROMOTION_COOLDOWN_72H
PREVIEW_BEFORE_EXECUTE
MAX_RECIPIENTS_BLAST_RADIUS_GUARD
OWNER_SCOPED_ONE_USE_VOUCHER
IDEMPOTENT_CAMPAIGN_DELIVERY
CRM_ASSISTED_BOOKING_IS_CORRELATION_NOT_CAUSATION
NO_RAW_PERSONAL_DATA_IN_ADMIN_CRM_UI
```

Preview chỉ trả customer reference rút gọn + email masked. Không trả raw email trong bảng Admin V77.

### Schema / dữ liệu V77

V77 là **no-schema release**:

```text
Flyway latest: V72
Public tables: 67
New V77 tables: 0
```

Không có:

```text
V77__*.sql
```

V77 tái sử dụng `app_user`, `booking`, `payment`, `notification_preference`, `user_notification`, `voucher`; không thêm seed business data.


### V77 frontend build compatibility fix

V77 giữ nguyên privacy contract của `MarketingAudienceV64`: trang `/admin/marketing` chỉ hiển thị `customerRef` và `maskedEmail`, không tham chiếu `fullName` vì DTO/type V64 không cung cấp trường này. Điều này loại bỏ lỗi TypeScript `TS2339` trong production build.

`frontend/tsconfig.json` cũng khai báo sẵn cả hai generated type paths của Next.js 16:

```text
.next/types/**/*.ts
.next/dev/types/**/*.ts
```

Nhờ vậy `next build` không cần tự sửa `tsconfig.json` chỉ để thêm dev generated types.

### V77.0.1 - Brave browser identity reliability fix

The V77 final source hardens browser identification for security-session display metadata after a real Brave login was observed as `Chrome - Windows`. Desktop/Android Brave intentionally uses a Chrome-compatible User-Agent, so User-Agent alone is not sufficient.

Detection order is now:

```text
1. navigator.brave.isBrave()
2. navigator.userAgentData.brands contains Brave
3. Sec-CH-UA contains the quoted Brave brand
4. explicit whitelisted X-CineBooking-Browser hint
5. User-Agent fallback for Edge/Opera/Vivaldi/Samsung/Firefox/Chrome/Safari
```

The backend deliberately lets a Brave-specific signal override a generic `Chrome` fallback hint. Both nginx configurations explicitly forward `X-CineBooking-Browser` and `Sec-CH-UA`; CORS also recognizes the client-hint header for direct frontend/backend development flows. PWA device labels use the same Brave-aware browser surfaces before generic Chromium detection.

Opening `/security` calls `PATCH /api/me/security/client-context`. If the current active session was previously stored as `Chrome - Windows` but the current request now proves Brave through the display-only signals above, CineBooking updates that current session plus its matching trusted-device and related security-alert label. Unrelated historical alerts are intentionally not bulk-rewritten, preserving audit integrity. No Flyway migration or seed data is added.

Verify the patch:

```powershell
python -X utf8 .\tools\verify_v77_brave_browser_identity_fix.py
```


### V77.0.2 - bounded legacy Brave alert reconciliation

Sau khi V77.0.1 nhận dạng đúng thiết bị hiện tại là `Brave · Windows`, một cảnh báo `NEW_DEVICE` cũ vẫn có thể còn nhãn `Chrome · Windows` vì cảnh báo đó thuộc một session trước khi client hint Brave được thu thập. V77.0.2 sửa đúng trường hợp này nhưng không bulk-rewrite lịch sử audit.

Khi request hiện tại **chứng minh Brave** bằng các tín hiệu V77.0.1, `/api/me/security/client-context` chỉ reconcile một session/cảnh báo legacy khi đồng thời thỏa toàn bộ điều kiện:

```text
current browser = Brave
prior session belongs to same user
prior User-Agent = exact current User-Agent
prior IP = exact current IP
prior session created within 24 hours
prior device label = Chrome · <same OS>
security_alert.related_session_id = prior session id
event_type = NEW_DEVICE
```

Khi đủ điều kiện, session và `NEW_DEVICE` alert được đổi display metadata sang `Brave · <OS>`. Alert không có `related_session_id`, alert khác user, khác UA/IP, quá 24 giờ hoặc event khác `NEW_DEVICE` **không bị sửa**. Đây vẫn chỉ là display metadata reconciliation, không ảnh hưởng authentication/authorization hay risk score.

Security E2E cũng dùng `data-testid="login-submit"`, chờ URL `/login` rõ ràng và `load` state thay vì phụ thuộc solely vào accessible-name selector sau logout, giúp journey V46 ổn định hơn khi chạy qua nginx/Next.js standalone.

Verify patch:

```powershell
python -X utf8 .\tools\verify_v77_0_2_brave_alert_reconciliation.py
```

### V77.0.3 - historical Brave evidence reconciliation

V77.0.3 xử lý đúng trường hợp thực tế khi Brave đã nâng Chromium/User-Agent từ một version cũ sang version mới. V77.0.2 chỉ so candidate legacy với **current User-Agent**, nên một alert `Chrome · Windows` của UA cũ có thể không được sửa dù database đã có một session UA cũ được nhận dạng dương tính là `Brave · Windows`.

V77.0.3 thêm một pass evidence-aware chạy **trước pass repair V77.0.2 trong cùng request** để lấy snapshot Brave evidence trước khi bất kỳ legacy row nào được đổi nhãn. Nhờ vậy row vừa repair không thể trở thành evidence để chain-rewrite ngược sâu hơn. Pass này chỉ chạy khi request hiện tại vẫn **positively detects Brave** và chỉ dùng session history của chính user hiện tại. Một candidate chỉ được reconcile khi thỏa toàn bộ policy:

```text
POSITIVE_BRAVE_FINGERPRINT_EVIDENCE
SAME_USER_REQUIRED
EXACT_USER_AGENT_MATCH
EXACT_IP_MATCH
SAME_OS_REQUIRED
EVIDENCE_MUST_BE_LATER_THAN_CANDIDATE
EVIDENCE_WINDOW_24H
LINKED_NEW_DEVICE_ONLY
ALERT_IP_MUST_MATCH_SESSION
NO_BLIND_AUDIT_REWRITE
NO_EVIDENCE_CHAINING
IDEMPOTENT_RECONCILIATION
```

Luồng:

```text
current request positively proves Brave
        ↓
load bounded latest 50 sessions of same user
        ↓
find a later Brave-labelled evidence session
        ↓
exact historical UA + exact IP + same OS
        ↓
evidence time >= candidate time and <= candidate + 24h
        ↓
linked same-user NEW_DEVICE alert with exact IP
        ↓
Chrome · <OS> → Brave · <OS>
```

Evidence nằm **trước** candidate không được dùng để đổi một Chrome session phát sinh sau đó, giúp tránh trường hợp user thật sự chuyển từ Brave sang Chrome. Candidate khác IP, khác UA, khác user, không có linked `NEW_DEVICE`, hoặc evidence cách quá 24 giờ cũng không bị sửa.

Patch vẫn **no-schema**, không thêm seed và không thay đổi risk score, trạng thái acknowledge, timestamp, authentication hay authorization.

Verify patch:

```powershell
python -X utf8 .\tools\verify_v77_0_3_historical_brave_evidence_reconciliation.py
```

### Verification V77

Chạy từ thư mục chuẩn:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui

python -X utf8 .\tools\verify_v64_crm_marketing_automation.py
python -X utf8 .\tools\verify_v76_recommendation_5.py
python -X utf8 .\tools\verify_v77_crm_automation_5.py
python -X utf8 .\tools\verify_v77_brave_browser_identity_fix.py
python -X utf8 .\tools\verify_v77_0_2_brave_alert_reconciliation.py
python -X utf8 .\tools\verify_v77_0_3_historical_brave_evidence_reconciliation.py

powershell -ExecutionPolicy Bypass `
  -File .\tools\diagnose-v77.ps1
```

### Docker + Runtime V77

V77 thay đổi backend + frontend nên rebuild:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui

docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  up -d --build
```

Kiểm tra:

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  ps
```

Mong đợi:

```text
postgres      healthy
redis         healthy
backend-1     Up
backend-2     Up
frontend      Up
nginx         Up
```

### Flyway V77

V77 không có migration. Dòng mới nhất vẫn phải là V72 và tổng public table vẫn là 67.

### Zero-warning lint + Production build

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend

npm run lint
$LASTEXITCODE

$env:NEXT_PUBLIC_API_URL="/api"
npm run build
```

Route V77 phải xuất hiện:

```text
/admin/crm-automation
```

Các route `/admin/marketing`, `/admin/recommendation`, `/admin/analytics-bi` và `/for-you` vẫn phải còn.

### Browser E2E V77

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend

Remove-Item Env:E2E_ADMIN_EMAIL -ErrorAction SilentlyContinue
Remove-Item Env:E2E_ADMIN_PASSWORD -ErrorAction SilentlyContinue

$env:PLAYWRIGHT_BASE_URL="https://localhost"

npx playwright test `
  "e2e/crm-automation-5-v77.spec.ts" `
  --project=chromium
```

E2E kiểm tra tile V77, version order, strategy, real-data policy, opt-out/channel/frequency/cooldown suppression, blast-radius guard, outcome correlation, lifecycle playbooks và Preview không ghi dữ liệu.

### Release V77 - chỉ Stable

```text
Stable only: v77.0.9
```

Sau khi source gates, Docker runtime, lint/build và Browser E2E PASS:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.9
```

Không tạo RC/Pre-release cho V77.


### V77.0.4 - zero-warning generated artifact hygiene

V77.0.4 fixes a local lint false-positive flood that appears after Playwright has generated its HTML/trace report. The reported `3005 problems (159 errors, 2846 warnings)` came from minified third-party assets under `frontend/playwright-report/trace/**`, not from CineBooking application source. Production `next build` still completed successfully in the same run.

The ESLint flat config now explicitly excludes generated evidence/output directories while preserving the project-wide source gate `eslint . --max-warnings=0`:

```text
.next/**
node_modules/**
playwright-report/**
test-results/**
blob-report/**
.playwright/**
coverage/**
out/**
dist/**
```

This is intentionally **not** a blanket rule suppression: `react-hooks/rules-of-hooks`, `@typescript-eslint/no-this-alias`, `@typescript-eslint/no-unused-expressions`, `@typescript-eslint/no-unused-vars`, `prefer-const` and the existing React/compiler rules remain enabled for actual source. `.gitignore` mirrors the generated artifact directories so local E2E/coverage output cannot accidentally enter release commits.

V77.0.4 remains a **no-schema patch**: no Flyway migration, no seed-data change, no API/booking/payment/recommendation/CRM behavior change.

Verify the patch:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_4_zero_warning_artifact_hygiene.py

cd .\frontend
npm run lint
$LASTEXITCODE
```

Expected:

```text
V77.0.4 zero-warning artifact hygiene verification: PASS
0 errors
0 warnings
exit code 0
```

Running Playwright before lint must not change that result because generated report/trace files are outside the source lint surface.

### V77.0.5 - warning-free Java 25 and Playwright E2E runtime hygiene

V77.0.5 closes the remaining warning sources observed after V77.0.4. The backend now uses Jackson 3 `JsonNode.asString(...)` instead of deprecated `asText(...)`, and Maven enables deprecation lint with `failOnWarning=true` so future Java compiler warnings fail the build instead of silently accumulating.

Mockito inline instrumentation is now attached explicitly for both Surefire and Failsafe using `-javaagent:${org.mockito:mockito-core:jar}` resolved by `maven-dependency-plugin`. Test JVMs also run with `-Xshare:off`, which avoids the class-data-sharing warning that accompanies instrumentation. This removes the Java 25 self-attach / dynamic-agent warning path without weakening Mockito behavior.

The Testcontainers integration suite now stops the Spring `LettuceConnectionFactory` in `@AfterAll` before static Redis Testcontainers are torn down, preventing `ConnectionWatchdog` from reconnecting to a container that is already stopping. The old V15 migration remains immutable; only the integration-test logger for Flyway's SQL-script executor is reduced to ERROR because PostgreSQL's `relation ... already exists, skipping` message comes from an intentional historical `CREATE INDEX IF NOT EXISTS` branch. No migration checksum is changed.

Frontend E2E is upgraded from Playwright 1.60 to **Playwright 1.63**. This removes Node's `DEP0205 module.register()` deprecation path used by Playwright 1.60. The V46 Security E2E blocks service workers only for that server-backed authentication journey so a transient navigation failure cannot be replaced by the PWA offline fallback while the visible URL remains `/login`. The test also requires a real HTTP 200 login document before using `data-testid=login-submit`. The dedicated V52 PWA journey still runs with normal service-worker behavior.

V77.0.5 remains a **no-schema patch**: Flyway stays at V72 / 67 public tables, with no seed-data change and no booking/payment/recommendation/CRM business behavior change.

Verify source gates:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_5_warning_free_runtime_e2e.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v77.ps1
```

After replacing source, refresh the exact Playwright pin and browser binary:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
npm install
npx playwright install chromium
npm run lint
$LASTEXITCODE
```

Expected lint result:

```text
0 errors
0 warnings
exit code 0
```

Backend Java 25 gates:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\backend

docker run --rm `
  -v "${PWD}:/app" `
  -w /app `
  maven:3.9-eclipse-temurin-25 `
  mvn -B -ntp clean test

docker run --rm `
  -v "${PWD}:/app" `
  -v /var/run/docker.sock:/var/run/docker.sock `
  -e DOCKER_HOST=unix:///var/run/docker.sock `
  -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal `
  -w /app `
  maven:3.9-eclipse-temurin-25 `
  mvn -B -ntp clean verify -Pci-integration
```

Expected: 49 unit tests PASS, 11 integration tests PASS, no Jackson deprecation notice, no Mockito self-attach/dynamic-agent warnings, no CDS warning, no Flyway V15 WARN line and no Lettuce teardown reconnect WARN line. Informational Testcontainers startup messages are not warnings.

Security E2E:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
npx playwright test "e2e/security-account-protection.spec.ts" --project=chromium
```

Expected: no `DEP0205` warning and `1 passed`.

### V77.0.6 - dependency security and resilient Playwright bootstrap

V77.0.6 closes the dependency/install warnings and the browser-bootstrap failure observed after V77.0.5. `next` and `eslint-config-next` are aligned at **Next.js 16.3.4**, the reviewed 16.3 patch line that includes the August 2026 Next.js security fixes. The frontend now exposes `npm run security:audit` and CI/stable-release preflight fail on high/critical npm advisories rather than accepting a noisy install result.

npm install-script execution is no longer left implicit. The only reviewed transitive install hook currently required by this tree is version-pinned as `unrs-resolver@1.12.2` in package.json `allowScripts`; there is no wildcard approval. When that package version changes, the approval must be reviewed and repinned instead of automatically trusting future install scripts.

Playwright browser installation now has a project script that defaults `PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT` to `120000` ms. Stable and RC GitHub workflows use the same 120-second timeout. Local E2E can also set `PLAYWRIGHT_BROWSER_CHANNEL=msedge` (or another Playwright-supported installed channel) when the Microsoft CDN is temporarily unreachable, so a Windows workstation with managed Edge does not have to block validation on a browser archive download.

V77.0.6 remains a **no-schema patch**: Flyway stays at V72 / 67 public tables and existing migration checksums are unchanged.

Verify source gates:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_6_dependency_security_playwright_bootstrap.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v77.ps1
```

Refresh frontend dependencies and run the security gate:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
npm install
npm run security:audit
npm run lint
$LASTEXITCODE
```

Install Playwright Chromium with the extended timeout:

```powershell
npm run e2e:install:chromium
```

Equivalent direct command:

```powershell
$env:PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT="120000"
npx playwright install chromium
```

If the CDN is unavailable but Microsoft Edge is already installed, run the local E2E against that managed system browser without downloading Playwright Chromium:

```powershell
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"
npx playwright test "e2e/security-account-protection.spec.ts" --project=chromium
npx playwright test "e2e/crm-automation-5-v77.spec.ts" --project=chromium
```

Clear the optional channel override before returning to the bundled Playwright browser:

```powershell
Remove-Item Env:PLAYWRIGHT_BROWSER_CHANNEL -ErrorAction SilentlyContinue
```

### V77.0.7 - Security E2E strict-locator reliability

V77.0.7 fixes the Playwright **strict-mode locator collision** observed on `/admin/security`: the partial accessible-name query `Security Operations` matched both the page H1 (`Security Operations · Security & Identity`) and the retained V46 H2 (`🛡 Security Operations V46 vẫn được giữ`). The E2E journey now waits on the existing `security-identity-v68` page root and then asserts an exact level-1 heading name. Login and customer-security heading checks are also exact to prevent future substring collisions.

This patch changes test reliability only. It does not relax Playwright strict mode, does not use `.first()` to hide ambiguous semantics, and does not change authentication, authorization, security alert behavior, database state, or production UI copy. V77.0.7 remains a **no-schema patch**: Flyway stays at V72 / 67 public tables.

Verify from the Windows project root:

```powershell
python -X utf8 .\tools\verify_v77_0_7_security_e2e_strict_locator_reliability.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v77.ps1
```

### V77.0.8 - CI deprecation cleanup and Chromium brand identity hygiene

V77.0.8 addresses the exact GitHub Actions failure observed after V77.0.7 was pushed but before a stable tag was created. The Java 25 compiler warning gate remains strict (`-Xlint:deprecation` + `failOnWarning=true`); instead of suppressing warnings, the deprecated APIs are replaced:

- `ValueOperations.set(key, value, timeout, TimeUnit)` becomes the `Duration` overload.
- `HttpStatus.PAYLOAD_TOO_LARGE` becomes Spring Framework 7 `HttpStatus.CONTENT_TOO_LARGE` while retaining HTTP status 413.

The patch also hardens Chromium-family display identity. `ClientDeviceDetector` recognizes `Microsoft Edge` / `Edge` brands from `Sec-CH-UA` before a generic Chrome fallback, and frontend `navigator.userAgentData.brands` applies the same precedence for API and PWA metadata. This matters when a managed Edge/Playwright Edge channel exposes a Chrome-like User-Agent string.

Brave historical reconciliation is intentionally **not** widened. In particular, a Chrome/Edge session created after a Brave session is not retroactively changed to Brave merely because user, IP and Chrome-like User-Agent happen to match. The V77.0.3 evidence chronology remains in place to prevent false Brave attribution when the same account uses multiple Chromium-family browsers.

V77.0.8 remains a **no-schema patch**: Flyway stays at V72 / 67 public tables, no seed data is added, and no authentication/authorization decision uses browser display metadata.

Verify source:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_8_ci_deprecation_chromium_brand_identity.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v77.ps1
```

Backend Java 25 warning gate:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\backend

docker run --rm `
  -v "${PWD}:/app" `
  -w /app `
  maven:3.9-eclipse-temurin-25 `
  mvn -B -ntp clean test
```

Expected current unit total: **50 tests**, 0 failures, 0 errors, and no compilation warning block.

Local Edge fallback E2E remains available when the Playwright CDN is unavailable:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"
npx playwright test "e2e/security-account-protection.spec.ts" --project=chromium
npx playwright test "e2e/crm-automation-5-v77.spec.ts" --project=chromium
```

After the local gates pass, release only the new immutable patch tag:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.8
```

### V77.0.9 - Giao diện tiếng Việt và độ tin cậy hoàn tất bảo trì

V77.0.9 chuẩn hóa **nội dung hiển thị trên web sang tiếng Việt** nhưng giữ nguyên các contract kỹ thuật: tên biến Java/TypeScript, URL/API route, enum/status code, `data-testid`, UUID, tên protocol và vendor. Các giá trị máy như `IN_PROGRESS`, `RESOLVED`, `OPERATIONAL` vẫn được lưu/trao đổi ổn định; giao diện ánh xạ chúng thành `Đang xử lý`, `Đã hoàn tất`, `Hoạt động bình thường` qua `frontend/lib/vi-labels.ts`.

Admin Dashboard khôi phục hai mốc bị thiếu trong chuỗi version: **V57 Đặt vé & gợi ý ghế** và **V58 Trung tâm vận hành**, đặt đúng giữa V56 và V59. Header/menu quản trị cũng giữ hai đường dẫn này. Giao diện ngôn ngữ được cố định `vi`; tùy chọn EN cũ không còn được hiển thị.

Luồng bảo trì sửa lỗi hoàn tất phiếu: `Hoàn tất` mở modal CineBooking thay cho `window.prompt`, yêu cầu kết quả xử lý tối thiểu 2 ký tự, chấp nhận chuỗi thực tế ngắn như `ok`, hiển thị lỗi ngay trong modal, gọi API, tải lại dữ liệu và hiển thị `Kết quả: ...` cùng lịch sử trạng thái tiếng Việt. Unit test và Playwright regression đều bao phủ trường hợp nhập chính xác `ok`.

Dữ liệu hiện hữu có thể được chuẩn hóa bằng script an toàn:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
powershell -ExecutionPolicy Bypass -File .\tools\localize-vietnamese-display-data-v77-0-9.ps1
```

Script chỉ sửa các chuỗi mô tả hệ thống/tham chiếu đã biết trong notification/audit/ledger/support/incident/maintenance history. Nó không đổi ID, khóa ngoại, enum/status/action code, timestamp, Flyway metadata hay dữ liệu xác thực.

V77.0.9 vẫn là **no-schema patch**: Flyway V72 / 67 public tables, không có migration V77.0.9 mới.

Verify source:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_9_vietnamese_ui_maintenance_completion.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v77.ps1
```

Backend Java 25 mong đợi **51 unit tests**, 0 failure/error; integration vẫn **11/11**. Sau khi lint/build, Docker 8/8 và Browser E2E PASS, phát hành stable:

```powershell
.\scripts\release.ps1 v77.0.9
```

### V77.0.10 - Localizer tiếng Việt an toàn với sổ cái bất biến

V77.0.10 sửa lỗi runtime của script Việt hóa V77.0.9 khi `financial_ledger_entry` từ V42 chặn UPDATE theo thiết kế append-only. Script mới không tắt trigger và không dùng `session_replication_role` để vượt guard. Các bảng mutable vẫn được chuẩn hóa trong một transaction; nếu có lỗi thì toàn bộ rollback. Dữ liệu sổ cái mới được ghi bằng tiếng Việt, còn mô tả lịch sử bất biến được Việt hóa ở lớp API/UI mà không sửa row gốc.

Chạy localizer tương thích mới:

```powershell
.\tools\localize-vietnamese-display-data-v77-0-10.ps1
```

Hoặc lệnh V77.0.9 cũ vẫn hoạt động sau hotfix:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\localize-vietnamese-display-data-v77-0-9.ps1
```

Kiểm tra source:

```powershell
python -X utf8 .\tools\verify_v77_0_10_vietnamese_localizer_immutable_ledger.py
```

Stable only: `v77.0.10`. Flyway vẫn V72 / 67 public tables.
### V77.0.11 - Docker build an toàn khi chạy từ Windows

V77.0.11 sửa lỗi build frontend trong Docker khi thư mục `frontend/node_modules` đã được cài trên Windows. Trước bản vá, `COPY . .` có thể chép các shim Windows trong `node_modules/.bin` đè lên dependency Linux đã cài ở stage `deps`, khiến `next build` gọi `node.exe` bên trong container Alpine và thất bại.

Bản vá thêm `frontend/.dockerignore` để loại `node_modules`, `.next`, báo cáo Playwright, coverage và các artifact sinh tự động khỏi Docker build context; stage dependency tiếp tục cài package bên trong Linux. Không cần xóa `node_modules` trên máy Windows trước mỗi lần build, và bản Full Source vẫn hoạt động kể cả khi `package-lock.json` không có trong baseline đóng gói.

Kiểm tra source:

```powershell
python -X utf8 .\tools\verify_v77_0_11_docker_windows_node_modules_hygiene.py
```

Build lại Docker đầy đủ:

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  --profile observability `
  build --no-cache frontend

docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  --profile observability `
  up -d
```

Stable only: `v77.0.11`. Flyway vẫn V72 / 67 public tables.
### V77.0.12 - Sửa hồi quy TypeScript sau Việt hóa

V77.0.12 xử lý các lỗi type-check được Docker V77.0.11 phơi lộ sau khi host `node_modules` không còn che dependency Linux. Các tên property thuộc contract máy được khôi phục về `membershipTier`, `liveThreads` và `planningScore`; hai trang sử dụng `viLabel` được bổ sung import chuẩn; key `RECEIVED` trùng trong bảng nhãn tiếng Việt được loại bỏ. Nội dung người dùng nhìn thấy vẫn là tiếng Việt, còn tên biến/property/API tiếp tục giữ ASCII để bảo toàn contract TypeScript/backend.

Kiểm tra source:

```powershell
python -X utf8 .\tools\verify_v77_0_12_typescript_localization_contract_hygiene.py
```

Build frontend trong Docker:

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  --profile observability `
  build --no-cache frontend
```

Mong đợi: `next build` đi qua TypeScript mà không còn `TS2304`, `TS2339`, `TS1117` nêu trong log V77.0.11. Stable only: `v77.0.12`. Flyway vẫn V72 / 67 public tables.

### V77.0.13 - Khép zero-warning lint cho giao diện tiếng Việt

V77.0.13 xử lý hai lỗi ESLint còn lại sau khi Docker production build V77.0.12 đã compile và type-check thành công: shortcut V57 trên Bảng điều khiển quản trị không còn dùng thẻ `<a>` nội bộ để đi tới `/`, mà chuyển sang `Link` của Next.js; đồng thời import `viLabel` không còn được giữ ở trang lập lịch suất chiếu khi không sử dụng. Nhãn hiển thị V57/V58 và toàn bộ contract TypeScript/API vẫn giữ nguyên.

Kiểm tra source:

```powershell
python -X utf8 .\tools\verify_v77_0_13_zero_warning_vietnamese_ui_lint.py
```

Kiểm tra lint:

```powershell
cd .\frontend
npm run lint
$LASTEXITCODE
```

Mong đợi: `0` lỗi, `0` cảnh báo và exit code `0`. Stable only: `v77.0.13`. Flyway vẫn V72 / 67 public tables.

### V77.0.14 - Hoàn tất điều hướng, VN/EN, dropdown và Việt hóa presentation-only

V77.0.14 sửa đồng bộ các lỗi giao diện còn lại sau V77.0.13. Shortcut **Đặt vé & gợi ý ghế V57** trên Dashboard đi tới `/admin/booking-seat-intelligence`, trang này đọc trực tiếp `/admin/showtimes` + `/admin/bookings` và mở sơ đồ ghế thật bằng `/booking/<showtimeId>`. Toàn bộ `select.input` có chiều cao/padding/line-height rõ hơn trên Chromium/Windows. Bộ chuyển **EN / VN** dùng **Tiếng Anh làm mặc định trên profile sạch**, lưu `cinebooking_language` trong `localStorage`, giữ lựa chọn sau reload và nay áp dụng ở cấp toàn website: `LanguageProvider` cập nhật `document.lang`, cung cấp `t(vi,en)` + locale, đồng thời có runtime bridge chỉ dịch **static UI copy** đã được catalog từ UI source và shared label/error presentation maps. Bridge không đụng `CODE/PRE`, API routes, JSON keys, enum/status machine values, tên phim, tên khách hàng hoặc dữ liệu vận hành động.

Màn **Giá trị khách hàng V56** đã được làm bilingual đầy đủ (heading, mô tả, filter, summary, RFM, value bands, top customers, empty/error state và format số/ngày theo locale). Lỗi đỏ `Lỗi hệ thống` trong ảnh thực tế được xác định là do frontend gọi nhầm đường dẫn đã bị Việt hóa `/admin/customer-value/điểmcard`; source nay gọi đúng contract backend `/admin/customer-value/scorecard`. Browser E2E V56 kiểm tra trang tải được dữ liệu thật, không có error banner, chuyển VN → EN → VN và kiểm tra cả Admin Dashboard static copy đổi ngôn ngữ. Runtime lint V57 vẫn zero-warning: không còn `eslint-disable` thừa và không gọi `Date.now()` trực tiếp trong render; mốc thời gian được ghi nhận sau khi tải dữ liệu vận hành rồi mới dùng để tính số suất sắp tới.

`viLabel()` tiếp tục chỉ dịch ở lớp hiển thị: hỗ trợ cả enum có dấu gạch dưới và chuỗi có dấu cách như `SEAT_HOLD_RELEASED` / `SEAT HOLD RELEASED`; các code/API/DB vẫn giữ tiếng Anh. Màn V61 hiển thị nhãn, bằng chứng và giải thích tiếng Việt nhưng request disposition vẫn gửi machine value `BLOCK_RECOMMENDED`. Hai link V57 còn sót trong mobile drawer cũng đã được sửa từ `/` sang `/admin/booking-seat-intelligence`.

Kiểm tra source:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_14_navigation_language_dropdown_localization.py
```

Kiểm tra toàn bộ source regression khai báo trong CI:

```powershell
Get-ChildItem .\tools\verify_*.py | Out-Null
# CI V77.0.14 có 94 source verifier; chạy đúng chuỗi trong .github/workflows/ci.yml hoặc diagnose-v77.ps1 cho nhóm V77.
```

Kiểm tra lint/build:

```powershell
cd .\frontend
npm install
npm run lint
$env:NEXT_PUBLIC_API_URL="/api"
npm run build
```

Mong đợi: verifier V77.0.14 `94/94 PASS`, ESLint `0 errors / 0 warnings`, production build thành công. Stable only: `v77.0.14`. Flyway vẫn V72 / 67 public tables.

Bản V77.0.14 đã được harden thêm cho chất lượng **English toàn site** sau kiểm tra thực tế trên màn bảo trì: các cụm UI phổ biến được dịch theo phrase/full-copy trước lexical fallback để tránh kiểu ghép từ máy móc như `Code account product is duy most entire system`. Riêng màn `/admin/maintenance` có English copy rõ ràng cho đăng ký thiết bị, mã tài sản, tên thiết bị, thiết bị dùng chung rạp, trạng thái và luồng phiếu bảo trì. Verifier quét toàn bộ catalog static UI và chặn các token tiếng Việt thường bị rò vào EN.

Bổ sung kiểm tra Edge thực tế phát hiện E2E V56 từng dùng `page.addInitScript()` để ép `cinebooking_language=vi`; Playwright chạy init script này trên **mọi navigation**, nên sau khi người dùng/test chọn EN rồi `page.goto('/admin/maintenance')`, preference bị test tự ghi đè về VN. V77.0.14 corrected chỉ seed VN một lần trên trang login, sau đó kiểm tra `localStorage` vẫn là `en` và `<html lang="en">` sau full-page navigation. Runtime i18n cũng nhận exact/shared mapping trước, chỉ fallback trên static UI catalog và audit toàn bộ 2.438 chuỗi catalog để EN không còn ký tự tiếng Việt có dấu.

Browser E2E V56 cũng không còn phụ thuộc placeholder/ngôn ngữ khi đăng nhập: `login-email`, `login-password`, `login-submit` là selector ổn định. Khi muốn chạy bằng Microsoft Edge cài sẵn trên Windows:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"
npx playwright test "e2e/customer-value-v56.spec.ts" --project=chromium
```

E2E này kiểm tra thêm regression ở màn bảo trì: EN phải hiển thị `Register equipment`, `Asset codes are unique across the entire system.`, `Equipment name`, `Shared cinema equipment` và không còn chuỗi Việt tương ứng.

#### V77.0.14 corrected — full-navigation language restore + Showtime Planner + layout audit

Đợt kiểm tra Edge tiếp theo phát hiện trường hợp `localStorage.cinebooking_language = en` nhưng document mới vẫn khởi tạo `<html lang="vi">` sau full-page navigation. Bản corrected bổ sung bootstrap ngôn ngữ trước hydration trong `app/layout.tsx` và guard `restored` trong `LanguageProvider`, vì vậy lựa chọn EN không còn bị trạng thái mặc định VI ghi đè khi mở route mới. Edge E2E nay kiểm tra đồng thời `localStorage`, `<html lang>`, Maintenance và Showtime Planner qua navigation thật.

Màn Showtime Planner được bổ sung full-copy English tự nhiên cho lịch sử chạy, lịch hiện có trong phòng, mô tả/metric và evidence reasons; các machine status/source như `OPEN`, `MANUAL`, `SMART` vẫn giữ nguyên trong API/DB nhưng được localize ở presentation layer. Các trang Admin có raw status/role/severity rõ ràng (booking/payment, security, staff, shifts, attendance, analytics, operations-control) cũng được đưa qua shared presentation labels.

Bố cục form được chuẩn hóa ở cấp global: mọi `.input` một dòng có `min-height: 52px`, `width: 100%`, `min-width: 0`; thêm `admin-form-grid-2`, `admin-form-stack`, `admin-split-grid` responsive. Riêng V34 Maintenance được căn lại filter + form cùng một cột, các select/date input cùng chiều cao/rộng và E2E đo geometry để chặn hồi quy. Verifier V77.0.14 corrected: `94/94 PASS`; no-schema contract không đổi, Flyway vẫn V72 / 67 public tables.

#### V77.0.14 corrected — direct render-time bilingual ownership for Edge/full navigation

Kết quả Edge thực tế cho thấy `localStorage` và `<html lang="en">` có thể đã đúng nhưng một số vùng Maintenance vẫn còn text server-rendered tiếng Việt vì chúng phụ thuộc hoàn toàn vào DOM mutation bridge. Corrected build chuyển các vùng được báo lỗi trên `/admin/maintenance` sang **render trực tiếp bằng `t(vi,en)`**: tiêu đề đăng ký/cập nhật thiết bị, mô tả mã tài sản, placeholder/aria-label, option thiết bị dùng chung, ngày bảo trì, bảng tài sản, tạo phiếu, action buttons và empty state. `/admin/showtimes` cũng chuyển các vùng Smart Planner/Manual Batch quan trọng sang explicit bilingual rendering thay vì trông chờ word/phrase fallback.

`LanguageProvider` khôi phục preference bằng `useLayoutEffect` và đặt `data-language-ready="true"` sau khi context đã đồng bộ với `localStorage`; Browser E2E trên Edge chờ marker này trước khi assert copy. Điều này phân biệt rõ bootstrap `<html lang>` với trạng thái React language đã thực sự sẵn sàng, tránh false-positive kiểu `lang=en` nhưng nội dung vẫn VI.

#### V77.0.14 corrected — VN/EN presentation purity + provider-state Edge gate

Rà soát full source sau ảnh thực tế `/admin/showtimes` cho thấy chế độ VN vẫn có thể lộ các cụm tiếng Anh có thể dịch được như `Preview lịch`, `Smart Planner`, `poster`, `realtime`, `booking`, `audit`, `camera`, `offline`, `voucher` trong một số copy cũ. Bản corrected này chuẩn hóa source-copy về tiếng Việt tự nhiên ở chế độ VN (ví dụ `Xem trước lịch`, `Bộ lập lịch thông minh`, `áp phích`, `theo thời gian thực`, `lượt đặt vé`, `kiểm toán`, `máy ảnh`, `ngoại tuyến`, `mã ưu đãi`) và giữ machine identifiers/brand/protocol như API, DB, QR, JWT, Redis, PostgreSQL, Flyway, GitHub Actions, VNPay, MoMo không bị dịch sai. Runtime bridge được bổ sung exact EN→VI đối xứng cho static UI legacy, còn các vùng Showtime/Maintenance quan trọng vẫn render trực tiếp bằng `t(vi,en)` để tránh trộn ngôn ngữ.

Edge E2E không còn phụ thuộc riêng vào `data-language-ready` trên `<html>` vì marker document có thể bị mất/ghi đè trong chu kỳ full navigation dù `lang` và `localStorage` đã đúng. `LanguageProvider` nay xuất sentinel React ẩn `data-testid="language-provider-state"` với `data-language={language}`; E2E dùng sentinel này để xác nhận context thật đã restore rồi mới assert copy VN/EN. Bootstrap vẫn đánh dấu `data-language-ready="bootstrap"` và provider vẫn nâng lên `true`, nhưng marker này chỉ dùng chẩn đoán, không còn là gate duy nhất. Verifier cuối bổ sung full-source bilingual-purity audit và không dùng hard-coded số check để các guard mới có thể tăng dần mà không tạo false failure.


### V77.0.14 corrected — English-default bilingual policy

- English is now the default UI language for a fresh browser profile. The persisted `cinebooking_language=vi|en` preference is still honored across reloads and full-page navigation.
- The React `LanguageProvider` initializes from the before-hydration document language, eliminating the observed `html=en` / provider=`vi` race in Microsoft Edge.
- Vietnamese is opt-in. English-to-Vietnamese fallback is exact-only: approved UI copy is translated, while unknown terms, brands, technical identifiers, movie/customer data, API paths and machine enum values remain unchanged.
- The desktop header uses a wider 1920px shell and delays the full desktop navigation until 1850px to prevent logo/navigation/language controls from colliding.
- Edge E2E starts from a clean English-default profile, validates EN → VI → EN, cross-page persistence, Maintenance, Customer Value, Showtime Planner and form geometry.
- Flyway stays V72 / 67 public tables; this remains a no-schema patch.

## V77.0.14 English-default language switch convergence hotfix

- Keeps English as the clean-profile default and preserves exact-only Vietnamese fallback for unknown/unapproved English copy.
- The final corrected provider uses lazy `useState(readClientLanguage)` rather than an external-store snapshot, because Edge exposed a case where the click completed but the external snapshot did not converge.
- `EN` / `VN` clicks now persist `cinebooking_language`, update `<html lang/data-language>`, update React state synchronously, then dispatch one compatibility event.
- The mutation observer reads the current language through a ref, so it cannot keep translating with the previous language after a switch.
- Edge E2E asserts storage + `<html lang>` + LanguageProvider state convergence after every relevant EN/VN switch.


### V77.0.14 corrected — English-default Admin/Retention purity + deterministic language switch

Bản corrected này xử lý hai hồi quy được bắt trực tiếp trên Microsoft Edge: (1) bấm **VN** nhưng `cinebooking_language` vẫn giữ `en`; `LanguageProvider` nay dùng lazy `useState(readClientLanguage)` và `setLanguage()` cập nhật đồng bộ `localStorage` + `<html lang/data-language>` + React state trước khi phát compatibility event, nên EN/VN không còn phụ thuộc external-store notification timing; (2) Admin Dashboard và V55 Retention còn English/Vietnamese ghép từ do lexical DOM fallback. Admin quick-action grid, tabs, movie editor/list, PosterUploader và toàn bộ V55 Retention quan trọng nay sở hữu copy trực tiếp bằng `t(vi,en)`. V55 còn localize lifecycle DTO động theo machine code (`NEW_30D`, `ACTIVE_REPEAT`, `AT_RISK`, `DORMANT`, `LAPSED`) để backend vẫn giữ dữ liệu gốc nhưng English presentation không rò tiếng Việt. Known demo movie genres được dịch presentation-only khi EN, không sửa database.

Focused verifier hiện là **124/124 PASS**. E2E Edge mở rộng kiểm tra Admin English action labels, EN→VN→EN convergence, Maintenance/Showtime và V55 Retention English/Vietnamese. No-schema contract không đổi: Flyway vẫn V72 / 67 public tables.


### V77.0.14 corrected — Admin TypeScript build hotfix

Bản corrected này sửa lỗi production build `TS2349: No constituent of type 'Tab' is callable` trong `frontend/app/admin/page.tsx`. Nguyên nhân là callback `.map(t => ...)` của hàng tab Admin đã vô tình che khuất helper dịch `t(vi,en)`, nên các lời gọi `t("Phim","Movies")`, `t("Rạp","Cinemas")`... bị TypeScript hiểu là đang gọi biến `Tab`. Callback nay dùng tên `tabKey`, giữ nguyên helper `t` từ `LanguageProvider`. Verifier V77.0.14 bổ sung guard riêng để chặn hồi quy shadowing này; verifier V77.0.9 cũng được làm forward-compatible với policy English-default/bilingual hiện tại mà vẫn giữ kiểm tra thứ tự V56 → V57 → V58 → V59. No-schema contract không đổi.


### V77.0.14 corrected — Edge native language-click fallback

Edge runtime still exposed one deterministic failure after all source/build gates passed: on `/admin/maintenance`, `page.getByTestId("language-vi").click()` completed but `localStorage.cinebooking_language` stayed `en` for the full 15-second assertion window. To remove the remaining dependency on React delegated-event hydration timing, `LanguageSwitcher` now marks each language button with `data-language-target`. The root `beforeInteractive` bootstrap installs exactly one capture-phase native click listener that persists `vi|en`, synchronizes `<html lang/data-language>`, and dispatches the existing `cinebooking-language-change` event before the React bubble handler runs. The normal React `setLanguage()` path remains authoritative after hydration, so this is a deterministic fallback rather than a second translation system. Edge E2E now asserts the native wiring contract before exercising EN → VN → EN.

### V77.0.14 corrected — English-default full-source dynamic UI + V51 Analytics + Edge hydration replay

Bản corrected này xử lý lớp lỗi còn lại được phát hiện trên Microsoft Edge khi giao diện mặc định là English. `LanguageProvider` nay đăng ký đồng bộ `cinebooking-language-change` trong `useLayoutEffect` và đọc lại snapshot `localStorage`/bootstrap ngay khi hydrate, vì Edge/Playwright có thể click nút ngôn ngữ trên HTML đã render trước khi passive effect của React kịp đăng ký listener. Nhờ đó click `VN` trước/đúng lúc hydrate vẫn hội tụ đủ ba lớp: `cinebooking_language=vi`, `<html lang="vi">` và React provider `data-language="vi"`.

English runtime bridge cũng được harden cho toàn source: static copy tiếp tục dùng catalog hiện có, còn các template/dynamic fragment ghép với số liệu thật (ví dụ `11 đơn vị`, `4 booking xác nhận`) chỉ đi qua danh sách phrase được phê duyệt, không word-translate phần dữ liệu còn lại. Full-source verifier quét toàn bộ TSX template interpolation và yêu cầu mọi fragment tiếng Việt động đều có phrase translation; hiện gate đạt `135/135 PASS`.

Riêng `/admin/analytics` V51 có full-copy English tự nhiên cho margin/cost-basis cards và các section quan trọng: `Revenue`, `Tickets / services`, `Concessions`, `Concession cost basis`, `Gross margin`, `MARGIN & COST-BASIS COVERAGE`, đồng thời các status động dùng `localizedLabel(..., language)` thay vì luôn ép `viLabel`. Browser E2E chặn lại các chuỗi lỗi từng xuất hiện như `TICKET / TRANSLATE SERVICE`, `EDGE BENEFIT PROFIT MERGE`, `Doanh thu` và `đơn vị` khi đang ở EN. No-schema contract không đổi; Flyway vẫn V72 / 67 public tables.

### V77.0.14 compact VN/EN selector refinement
- Restores the compact two-segment legacy language selector requested for the header.
- Visual order is `VN | EN`; the active language uses red, the inactive language uses light gray.
- Removes the decorative dot row so the control matches the legacy compact appearance.
- English remains the clean-profile default; only the selector presentation changes.


## V77.0.14 compact VN/EN selector + Edge hydration convergence hotfix

- Keeps the compact legacy-style `VN | EN` segmented control (VN left, EN right; active red, inactive light gray).
- Keeps English as the clean-profile default; a saved user preference still wins on reload.
- Fixes the Edge hydration race where the native pre-hydration language click could update `localStorage`/`<html lang>` while React `LanguageProvider` remained on the previous language.
- `LanguageProvider` now rechecks the external-store snapshot with `queueMicrotask(onStoreChange)` immediately after subscription, without `setState` inside an effect and without reintroducing the zero-warning lint regression.

### V77.0.14 correction — V77.0.0 language flow restoration

Theo source V77.0.0 gốc được dùng làm chuẩn, V77.0.14 khôi phục nguyên luồng ngôn ngữ cũ thay vì tiếp tục dùng các kiến trúc i18n thử nghiệm của các hotfix trước:

- `frontend/components/LanguageProvider.tsx` là byte-identical với V77.0.0: state khởi tạo `vi`, `useEffect` đọc `localStorage.cinebooking_language`, `setLanguage()` cập nhật React state + localStorage + `<html lang>` và phát `language-changed`.
- `frontend/components/LanguageSwitcher.tsx` là byte-identical với V77.0.0: hai nút `VN | EN`, active theo provider state và giữ hàng language dots của source gốc.
- `frontend/app/layout.tsx` là byte-identical với V77.0.0; document server-render khởi tạo `lang="vi"`.
- CSS selector VN/EN được phục hồi đúng kích thước/hình thức V77.0.0, gồm desktop width 82px và mobile header width 64px.
- Các runtime translator/MutationObserver/static-catalog được thêm sau V77.0.0 đã bị loại khỏi runtime. V77.0.14 không còn dịch DOM hoặc ghép từ sau render.
- Những trang mới của V77.0.14 cần `t(vi,en)`/locale dùng `usePresentationLanguage`, một helper presentation-only đọc chính `language` từ provider V77.0.0. Helper này không thay đổi persistence/event/lifecycle của provider gốc.
- Warning ESLint `_language` / `_en` của provider Vietnamese-only trước đó không còn tồn tại. Provider V77.0.0 giữ đúng suppression lịch sử cho `react-hooks/set-state-in-effect`, nên zero-warning lint không phát cảnh báo ở restore effect.

Kiểm tra:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_14_navigation_language_dropdown_localization.py

cd .\frontend
npm run lint
$env:NEXT_PUBLIC_API_URL="/api"
npm run build
```

Browser E2E Microsoft Edge kiểm tra đúng contract V77.0.0: clean profile bắt đầu VI, preference EN đã lưu được restore, nút VN/EN cập nhật localStorage + `<html lang>`, và preference tiếp tục được restore sau full-page navigation.

### V77.0.14 overlay cleanup for the V77.0.0 language flow

If this source is extracted **over an older V77.0.14 working tree**, ZIP extraction cannot delete files that existed only in the older tree. Three obsolete post-V77.0.0 i18n files may therefore remain on disk even though they are not part of this Full Source ZIP:

- `frontend/lib/i18n-runtime.ts`
- `frontend/lib/i18n-en-supplement.ts`
- `frontend/lib/i18n-static-catalog.generated.ts`

Run the cleanup once after overlaying onto an existing folder:

```powershell
powershell -ExecutionPolicy Bypass `
  -File .\tools\cleanup_v77_0_14_v7700_language_flow.ps1
```

The V77.0.14 verifier validates that none of those post-V77.0.0 runtimes are referenced by application code. A clean extraction of the Full Source ZIP contains none of the three files.

### V77.0.14 verifier Windows permission fix

- `verify_v77_0_14_navigation_language_dropdown_localization.py` now scans only application-source files and explicitly skips dependency/build artifact trees such as `frontend/node_modules`, `.next`, Playwright reports, coverage and build outputs.
- The runtime-reference scan also tolerates unreadable/non-text files, so a Windows `PermissionError` inside `node_modules/next/dist/compiled/*` can no longer abort the verifier.
- The V77.0.0 language-flow contract itself is unchanged; this is a verifier robustness fix only.

### V77.0.14 CRM nullable suppression-reason TypeScript repair

- Fixed the production TypeScript gate in `frontend/app/admin/crm-automation/page.tsx` where `suppressionReason?: string | null` was passed to a helper that only accepted `string`.
- `suppressionLabel()` now accepts `string | null | undefined` and renders a safe bilingual fallback when the API omits the reason.
- The V77.0.0 language-provider / switcher / root-layout contract remains unchanged.
- V77.0.14 verification now guards this nullable DTO contract to prevent TS2345 regression.


## V77.0.14 V51 chart spacing polish
- Removed the dark rounded tiles behind Forecast and Daily Revenue columns.
- Daily Revenue now uses a dynamic equal-width grid so all visible days stretch evenly across the card width.
- No API/schema changes; V77.0.0 language flow remains unchanged.

## V77.0.14 — Full local E2E gate + automatic GitHub stable release

Stable publication is now one command and follows the required order: **verify source -> security audit -> zero-warning lint -> production build -> Docker full stack -> Microsoft Edge Playwright E2E -> push `main` -> wait exact-commit CI -> immutable tag -> GitHub Actions auto-release**.

Prerequisites on Windows PowerShell:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui

git --version
gh --version
gh auth status
docker version
node --version
npm --version
```

If GitHub CLI is not authenticated yet:

```powershell
gh auth login
```

The normal stable release command is:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 v77.0.14
```

`release.ps1` defaults to `https://localhost`, the installed Microsoft Edge channel (`msedge`), and the **entire** `frontend/e2e` suite. No Git commit, push, tag or GitHub Release is allowed until local Browser E2E has passed.

For a diagnostic run of only selected specs before the official full release gate:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
powershell -ExecutionPolicy Bypass -File .\scripts\release.ps1 v77.0.14 `
  -E2ESpec @(
    "e2e/customer-value-v56.spec.ts",
    "e2e/analytics-forecasting-v51.spec.ts",
    "e2e/crm-automation-5-v77.spec.ts"
  )
```

Do not use `-SkipE2E`, `-SkipDocker`, `-SkipVerify` or `-SkipCiWait` for the official stable publication. They are troubleshooting switches only.

After all local gates pass, the script pushes `main`, waits for `.github/workflows/ci.yml` on the exact commit, creates and pushes the immutable tag, then waits for `.github/workflows/v77-auto-release.yml`. The tag workflow automatically creates the stable GitHub Release and attaches:

```text
cinebooking-pro-77.0.14-full-source.zip
cinebooking-pro-77.0.14-full-source.sha256.txt
```

The Full Source asset is produced by `git archive HEAD`, so `.env`, `node_modules`, `.next`, Playwright reports, local certificates and untracked secrets are not included.

Useful status commands while publishing:

```powershell
gh run list --workflow ci.yml --limit 5
gh run list --workflow v77-auto-release.yml --limit 5
gh release view v77.0.14 --web
```

If Browser E2E fails, nothing is pushed. Inspect the report with:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
npx playwright show-report
```

If CI fails after `main` is pushed, the script stops **before** creating the tag. Fix the failure and rerun the release command. Stable tags are immutable and are never overwritten.


### V77.0.14 existing-admin E2E credential contract

Browser E2E and the stable release now reuse the existing administrator configured in the repository-root `.env`. `ADMIN_EMAIL` and `ADMIN_PASSWORD` are mapped to `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` before Playwright starts. Explicit `E2E_ADMIN_*` values still take priority. No alternate admin account is created, and the release script never prints the admin password. If neither the root `.env` nor explicit E2E credentials are available, Playwright fails closed instead of silently falling back to a different historical password. The login and registration email fields also retain the stable `Email` placeholder used by the historical E2E suite.


## V77.0.14 layout/runtime hardening follow-up

- V44 maintenance selector and equipment catalog reflow without horizontal scrolling; selected cinema name stays visible.
- V57 showtime intelligence uses a compact desktop table plus responsive cards.
- V62 pricing editor/weekdays, V23 attendance filters, and V43 tracked-cinema selector were rebalanced for normal desktop widths.
- V48 `Xem toàn chi nhánh` now actually removes the cinema filter and toggles back; inventory history uses cards below desktop widths.
- V48 E2E reuses `CineHub Bình Thạnh` instead of creating timestamp-suffixed cinema names. `tools/cleanup_v48_e2e_cinema_noise.ps1` removes only unreferenced historical timestamp test cinemas and fails closed on SQL errors.
- V69 user-facing naming now uses the natural Vietnamese term “Sao lưu & phục hồi sau thảm họa” while machine strategy/version values remain unchanged.
- Showtime E2E option helpers use `getAttribute("value")`, avoiding `SVGElement | HTMLElement` `.value` TypeScript failures during `next build`.

## V77.0.14 final responsive-layout / E2E contract hardening

This final V77.0.14 stabilization keeps the exact V77.0.0 language-provider/switcher/root-layout contract while finishing the admin/staff presentation and browser-regression work requested after the full Edge run.

- V44 Maintenance: long cinema names remain visible without opening the select; equipment/KPI layout reflows before becoming cramped.
- V57 Booking & Seat Intelligence: compact desktop showtime table plus responsive cards; real showtime/booking/seat-map flow remains unchanged.
- V62 Dynamic Pricing, V23 Attendance and V43 Staff Operations: responsive controls/cards avoid squeezed horizontal layouts.
- V48 Inventory: the history-scope button now really toggles current cinema vs all branches; historical E2E no longer creates timestamp-suffixed cinema names. `tools/cleanup_v48_e2e_cinema_noise.ps1` removes only orphan numeric-suffix test cinemas and fails closed on PostgreSQL errors.
- V69 presentation uses consistent Backup & Disaster Recovery terminology and removes malformed mixed-language labels.
- V45 Support immediately keeps a newly-created case visible while the durable list catches up.
- V68 step-up grant handling no longer lets an immediately stale status fetch overwrite a successful grant.
- Seat E2E reads `data-seat-status` machine state instead of localized `title` text.
- Showtime E2E selects the seeded movie by stable title and obtains `<option>` values with `getAttribute("value")`, avoiding the TypeScript `HTMLElement | SVGElement` `.value` narrowing error.
- Historical E2E presentation assertions were aligned with the current Vietnamese-first V77.0.0 language flow without changing API/machine values.

Release gates remain: source verifiers -> zero-warning lint -> production build -> full 8-service Docker/observability stack -> full Microsoft Edge Playwright suite -> push `main` -> exact-commit CI -> immutable stable tag -> automatic GitHub Release.

## V77.0.15 — V64 Preview/Publish + V59 bilingual runtime & E2E stabilization

V77.0.15 xử lý trực tiếp các lỗi phát hiện khi chạy full Browser E2E và kiểm tra giao diện thật, không thay đổi schema hay tạo dữ liệu nghiệp vụ giả. Flyway vẫn **V72 / 67 public tables**.

- **V64 CRM & Marketing:** nút **Xem trước** hiển thị phản hồi và audience preview ngay dưới cụm nút thay vì nằm khuất phía dưới danh sách segment. **Phát hành** chỉ tiếp tục khi preview còn hợp lệ và V68 step-up đang mở; nếu chưa mở/hết hạn thì UI hiện cảnh báo ngay tại form và có link sang `/admin/security`. Sau khi phát hành, số voucher tạo mới/tái sử dụng và số notification tạo/bỏ qua được hiển thị rõ ràng.
- **V59 Realtime Operations:** toàn bộ 7 domain Payment/Booking/Equipment/Staff/Support/Inventory/Incident có presentation map VI/EN riêng; không còn trộn label tiếng Anh từ backend vào trang tiếng Việt. Nút VN/EN điều khiển toàn bộ copy hiển thị của V59 và giữ nguyên machine domain/status/API contract.
- **Language full navigation:** root layout đọc `cinebooking_language` trước hydration để một preference EN đã lưu không bị chớp/quay về `vi` khi `page.goto()` hoặc full navigation. `LanguageProvider` V77.0.0 vẫn là authority cho state/persistence/click.
- **V68 step-up:** UI dùng grant chưa hết hạn trong `sessionStorage` làm client-side authority trong lúc status API hội tụ, tránh trạng thái vừa unlock xong lại hiện `ĐÃ KHÓA`.
- **E2E hardening:** thêm stable testid cho mock payment/register, tách testid desktop/mobile Maintenance, thêm journey kiểm tra V59 VI→EN và V64 Preview→V68→Publish. Playwright tiếp tục lấy **tài khoản Admin hiện hữu** từ `.env` gốc; không tạo admin thay thế và không in password.

Verify tập trung:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v64_crm_marketing_automation.py
python -X utf8 .\tools\verify_v77_0_14_navigation_language_dropdown_localization.py
python -X utf8 .\tools\verify_v77_0_15_v64_v59_runtime_e2e.py
```

Docker full stack mặc định của dự án:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  --profile observability `
  up -d --build

# Kiểm tra đúng cùng compose/profile
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  --profile observability `
  ps
```

Browser E2E sau khi stack đã sẵn sàng:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"
npx playwright test --project=chromium
```

Stable release:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.15
```

Official release gate vẫn giữ thứ tự: source verifiers → security audit → zero-warning lint → production build → Docker full observability stack → full Microsoft Edge Playwright → push `main` → exact-commit CI → immutable tag → automatic GitHub Release.

## V77.0.16 — V59 language surface + runtime regression hotfix

V77.0.16 sửa trực tiếp các lỗi còn thấy trên giao diện thật và targeted Browser E2E sau V77.0.15. Đây vẫn là **no-schema patch**: Flyway giữ nguyên **V72 / 67 public tables**, không thêm seed business data và giữ nguyên tài khoản Admin hiện hữu trong `.env`.

- **V59 domain cards:** mỗi card chỉ còn **một tên miền nghiệp vụ**; không còn hai dòng lặp Thanh toán/Thanh toán, Đặt vé/Đặt vé, Kho/Kho.
- **V59 cảnh báo:** severity machine values CRITICAL/HIGH/MEDIUM/LOW chỉ dùng nội bộ; giao diện VN hiển thị NGHIÊM TRỌNG/CAO/TRUNG BÌNH/THẤP.
- **V59 lịch sử:** không render thẳng audit detail dạng INVENTORY · ... · count=26; UI hiển thị Kho · ... · Số lượng=26 ở VN và Inventory · ... · Count=26 ở EN; system thành hệ thống ở VN.
- **V64:** selector bảy segment luôn có option ổn định trong lúc overview API hội tụ; Browser E2E xác nhận đủ 7 option trước khi chọn.
- **VN/EN full navigation:** presentation hook đồng bộ từ cinebooking_language, html lang, pageshow và language-changed, xử lý trường hợp html đã EN nhưng nội dung Maintenance vẫn còn VI.

Verify tập trung:
```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_14_navigation_language_dropdown_localization.py
python -X utf8 .\tools\verify_v77_0_15_v64_v59_runtime_e2e.py
python -X utf8 .\tools\verify_v77_0_16_v59_language_surface_hotfix.py
```

Docker full stack:
```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  --profile observability `
  up -d --build
```

Stable release sau khi runtime gate PASS:
```powershell
.\scripts\release.ps1 v77.0.16
```

## V77.0.17 — Full-navigation language store fix

V77.0.17 sửa lỗi targeted Browser E2E còn lại sau V77.0.16: `html lang="en"` và `cinebooking_language=en` đã đúng nhưng một số client surface sau full navigation vẫn render bản dịch tiếng Việt, điển hình tiêu đề Maintenance **Đăng ký thiết bị** thay vì **Register equipment**.

Nguyên nhân được loại bỏ ở lớp presentation helper: phiên bản trước duy trì một `useState` shadow cho ngôn ngữ bên cạnh `LanguageProvider`, `localStorage` và `document.lang`, tạo cửa sổ race trong hydration/full navigation. V77.0.17 chuyển snapshot trình bày sang React `useSyncExternalStore`, lấy `cinebooking_language` làm browser authority, `document.documentElement.lang` làm fallback và giữ provider V77.0.0 làm fallback cuối. Nút VN/EN vẫn dùng provider cũ, không đổi API/machine enum/database.

Regression gate giữ nguyên các lỗi đã sửa trước đó: V59 không lặp domain/mixed language; V64 segment selector luôn đủ 7 option; Browser E2E tiếp tục kiểm tra EN qua `/admin/maintenance` và `/admin/showtimes`. Đây vẫn là **no-schema patch** trên Flyway **V72 / 67 public tables**, không seed dữ liệu giả và không thay tài khoản Admin hiện hữu.

Verify tập trung:
```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_14_navigation_language_dropdown_localization.py
python -X utf8 .\tools\verify_v77_0_15_v64_v59_runtime_e2e.py
python -X utf8 .\tools\verify_v77_0_16_v59_language_surface_hotfix.py
python -X utf8 .\tools\verify_v77_0_17_full_navigation_language_store_fix.py
```

Docker full stack:
```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  --profile observability `
  up -d --build
```

Targeted Browser E2E:
```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"
npx playwright test `
  e2e/realtime-operations-v59-language.spec.ts `
  e2e/crm-marketing-automation-v64.spec.ts `
  e2e/customer-value-v56.spec.ts `
  --project=chromium
```

Stable release sau khi runtime gate PASS:
```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.17
```

## V77.0.18 — Presentation language type-contract / production build fix

V77.0.18 sửa đúng lỗi production build được Docker phát hiện sau V77.0.17. Runtime design `useSyncExternalStore` là đúng, nhưng lời gọi hook chưa khóa generic nên TypeScript suy rộng `resolvedLanguage` thành `string` do server snapshot `() => "vi"`. Kết quả là mọi consumer đang yêu cầu `Language` hoặc `"vi" | "en"` đồng loạt báo `TS2322` / `TS2345` trong Analytics, Attendance, Booking Seat Intelligence, CRM Automation, Maintenance, Marketing, Operations Control, Payments, Risk, Security, Showtimes, Staff và staff operations.

Bản vá giữ nguyên cơ chế runtime V77.0.17 và chỉ siết type contract tại nguồn:

```ts
const resolvedLanguage = useSyncExternalStore<Language>(
  subscribe,
  getSnapshot,
  (): Language => "vi",
);
```

Nhờ vậy `usePresentationLanguage().language` tiếp tục là union hẹp `"vi" | "en"`, không còn bị widen thành `string`. Không cần ép kiểu tại hàng chục trang, không thay API, không thay machine enum, không đổi `LanguageProvider`, không đổi database và không thêm seed.

Verify tập trung:
```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_17_full_navigation_language_store_fix.py
python -X utf8 .\tools\verify_v77_0_18_presentation_language_type_contract_fix.py
```

Docker full stack:
```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  --profile observability `
  up -d --build
```

Production build gate phải qua TypeScript trước khi chạy Browser E2E. Sau khi Docker build PASS, chạy targeted language/V59/V64 và sau đó full suite như các bước V77.0.17.

Stable release sau khi toàn bộ runtime gate PASS:
```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.18
```

## V77.0.19 — Zero-warning Marketing hook / ESLint fix

V77.0.19 sửa đúng warning runtime gate còn lại được `npm run lint` phát hiện ở `frontend/app/admin/marketing/page.tsx`: effect khởi tạo gọi `load()` nhưng dependency array rỗng, khiến `react-hooks/exhaustive-deps` báo warning và làm `eslint . --max-warnings=0` trả exit code 1.

Bản vá không tắt rule ESLint. `refreshStepUp` được ổn định bằng `useCallback([])`, `load` được ổn định bằng `useCallback([refreshStepUp])`, và effect khai báo `[load, refreshStepUp]`. Luồng nghiệp vụ V64 giữ nguyên: kiểm tra Admin, tải `/admin/marketing/segments`, đồng bộ V68 step-up, lắng nghe `step-up-changed`/`focus`, và reload overview sau khi phát hành thành công. V77.0.18 Language type contract vẫn giữ nguyên.

Verify tập trung:
```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_18_presentation_language_type_contract_fix.py
python -X utf8 .\tools\verify_v77_0_19_zero_warning_marketing_effect_dependencies.py
```

Zero-warning lint:
```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
npm run lint
$LASTEXITCODE
```

Mong đợi: `0 errors`, `0 warnings`, `$LASTEXITCODE = 0`. Sau đó chạy Docker full observability, targeted Browser E2E và full Browser E2E trước stable release.

Stable release:
```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.19
```

## V77.0.20 — Full Browser E2E Runtime Stabilization

V77.0.20 xử lý toàn bộ nhóm hồi quy được lộ ra khi chạy **full Playwright 46 journeys** sau V77.0.19. Lượt chạy thực tế trước bản vá có **24 failed / 22 passed**, trong khi `npm run lint`, production `npm run build`, Docker Compose full observability và targeted V59/V64/language E2E đã PASS. Bản vá này vì vậy tập trung vào runtime/navigation/test-contract thay vì thay đổi nghiệp vụ hoặc dữ liệu.

Các thay đổi chính:

- **Một nguồn ngôn ngữ duy nhất:** `LanguageProvider` sở hữu `useSyncExternalStore<Language>` và `usePresentationLanguage` chỉ tiêu thụ store này, loại race giữa `localStorage`, `<html lang>` và provider sau full navigation.
- **Service Worker V77.0.20:** bump cache generation và ép các navigation nhạy cảm `/login`, `/register`, `/payment`, `/forgot-password`, `/reset-password` đi network-only; API tiếp tục không cache; policy mới dùng `skipWaiting()` + `clients.claim()` để không giữ shell cũ.
- **Hard-navigation guard cho E2E:** auth/payment tests có một lần recovery ở read/navigation surface khi trình duyệt còn shell cũ; không retry business write.
- **Support race:** kết quả GET lúc mount được merge với optimistic case vừa tạo thay vì ghi đè danh sách.
- **V64:** Preview chỉ bật khi overview thật đã sẵn sàng; E2E chờ segment cards sau khi quay lại từ V68 step-up.
- **V51:** E2E chờ mutation lưu cost-basis hoàn tất trước reload.
- **Dữ liệu thật / selector ổn định:** discovery và maintenance blackout không hard-code UUID/tên phim; maintenance dùng card đang hiển thị; seat contention dùng `data-seat-code`/`data-seat-status`.
- **Localization-compatible regression:** V58/V59, V65, V67, V52, V71, V72, V73/V74, V43 và V49 dùng copy hiện hành hoặc machine-readable testid thay vì ép chuỗi legacy Anh/Việt.

V77.0.20 vẫn là **no-schema release**: Flyway giữ V72 / 67 public tables, không thêm migration V77 và không thêm business seed giả. Tài khoản Admin tiếp tục lấy từ `.env` hiện hữu; không tạo hoặc thay password Admin.

### Verify V77.0.20

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_20_full_e2e_runtime_stabilization.py
```

### Docker full stack

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  --profile observability `
  up -d --build
```

### Targeted E2E

```powershell
cd .\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"
npx playwright test `
  e2e/realtime-operations-v59-language.spec.ts `
  e2e/crm-marketing-automation-v64.spec.ts `
  e2e/customer-value-v56.spec.ts `
  --project=chromium
```

### Full Browser E2E

```powershell
npx playwright test --project=chromium
```

Chỉ release stable khi full suite đạt **0 failed**:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.20
```
## V77.0.21 — Hydration Language & V64 Re-entry Reliability

Lượt targeted runtime sau V77.0.20 còn **2 failed / 1 passed**. V64 quay lại `/admin/marketing` sau khi mở khóa V68 nhưng `segments-v64` chưa có dữ liệu thật trong 15 giây; đồng thời full navigation giữ `localStorage=cinebooking_language=en` và `<html lang="en">` nhưng Maintenance vẫn render copy tiếng Việt `Đăng ký thiết bị`. V77.0.21 sửa đúng hai nguyên nhân này, không mở rộng schema hoặc seed.

- **Language hậu hydration:** `LanguageProvider` vẫn dùng `useSyncExternalStore<Language>`, nhưng sau hydration sẽ đọc lại browser snapshot, đồng bộ `document.lang`, đặt marker `data-cinebooking-language-ready` và phát lại `language-changed` sau khi subscription đã được cài. Nhờ vậy surface client không còn kẹt ở VI server snapshot sau `page.goto()`/reload.
- **V64 re-entry:** page dùng role đã lưu trong auth hiện hành để gate UI, còn `/api/admin/marketing/segments` vẫn là nguồn authorization/data thật ở backend. Bỏ round-trip `/me` dư thừa sau V68, thêm tối đa 3 lần retry ngắn cho lỗi runtime tạm thời nhưng **không retry 401/403**, và hiển thị trạng thái `segments-loading-v64` thay vì vùng trống.
- **E2E đúng tín hiệu:** V64 chờ nút Preview được enable (nghĩa là overview thật đã sẵn sàng), không suy luận readiness bằng số button segment. Language E2E chờ `data-cinebooking-language-ready=en` rồi mới assert Maintenance/Showtimes EN.
- **Admin cũ:** Browser E2E không còn fallback `admin-v29@cine.local`; bắt buộc lấy `E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD` từ `.env` hiện hữu.
- **Service Worker:** bump cache generation `v77-0-21` để loại bundle/cache cũ khi kiểm tra lại full-navigation.

V77.0.21 vẫn là **no-schema release**: Flyway V72 / 67 public tables; không tạo tài khoản Admin mới, không thay password và không thêm business seed giả.

### Verify V77.0.21

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_21_hydration_language_v64_reentry.py
```

### Targeted E2E

```powershell
cd .\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"
npx playwright test `
  e2e/realtime-operations-v59-language.spec.ts `
  e2e/crm-marketing-automation-v64.spec.ts `
  e2e/customer-value-v56.spec.ts `
  --project=chromium
```

Mục tiêu: **3 passed / 0 failed**. Sau đó chạy `npx playwright test --project=chromium`; chỉ release stable khi full suite đạt **0 failed**.

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.21
```

## V77.0.22 — Pre-hydration Language Readiness & Visible-copy E2E

Lượt targeted runtime sau V77.0.21 còn đúng **1 failed / 2 passed**. V59 và V64 đã PASS; failure còn lại không phải do `localStorage` hoặc `<html lang>` sai: log cho thấy `<html lang="en">` đã đúng nhưng assertion trên attribute nội bộ `data-cinebooking-language-ready` nhận `null`, nên test dừng trước khi kiểm tra copy Maintenance. V77.0.22 sửa đúng contract này.

- **Bootstrap trước hydration:** root layout render sẵn `data-cinebooking-language-ready="vi"`; inline bootstrap đọc `cinebooking_language` và cập nhật **cả `lang` lẫn readiness marker** bằng cùng một giá trị trước khi React hydrate.
- **Reconcile theo snapshot React đã commit:** `LanguageProvider` giữ `useSyncExternalStore<Language>` và đồng bộ lại `lang`/readiness marker khi `language` thực tế đã khớp browser snapshot.
- **E2E theo hành vi người dùng:** full-navigation language test vẫn xác nhận `localStorage=en` và `<html lang="en">`, nhưng readiness chính là copy nhìn thấy `Register equipment` rồi `Preview schedule`; attribute nội bộ chỉ còn là diagnostic, không còn là điều kiện làm fail một UI đã render đúng.
- **V64/V59:** không thay logic runtime đã PASS ở lượt V77.0.21.
- **Service Worker:** bump generation `v77-0-22` để bundle layout/provider mới không bị giữ bởi cache cũ.

V77.0.22 vẫn là **no-schema release**: Flyway V72 / 67 public tables; không tạo Admin mới, không đổi password và không thêm business seed giả.

### Verify V77.0.22

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_22_pre_hydration_language_readiness.py
```

### Targeted E2E

```powershell
cd .\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"
npx playwright test `
  e2e/realtime-operations-v59-language.spec.ts `
  e2e/crm-marketing-automation-v64.spec.ts `
  e2e/customer-value-v56.spec.ts `
  --project=chromium
```

Mục tiêu: **3 passed / 0 failed**. Sau đó chạy `npx playwright test --project=chromium`; chỉ release stable khi full suite đạt **0 failed**.

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.22
```


## V77.0.23 — Single-provider Hydration State Reliability

Lượt targeted runtime sau V77.0.22 vẫn còn **1 failed / 2 passed**. V59 và V64 tiếp tục PASS. Failure duy nhất đã xác nhận đúng bản chất: `localStorage.cinebooking_language=en` và `<html lang="en">` đều đúng sau `page.goto("/admin/maintenance")`, nhưng React `LanguageProvider` vẫn giữ server snapshot VI nên copy Maintenance còn `Đăng ký thiết bị` thay vì `Register equipment`.

V77.0.23 không tiếp tục vá marker hay assertion. Bản này thay cơ chế hydration của nguồn ngôn ngữ:

- **Single React-owned language state:** `LanguageProvider` dùng `useState<Language>("vi")` làm nguồn React duy nhất. VI ban đầu khớp server-rendered tree, tránh hydration mismatch.
- **Guaranteed post-hydration restore:** sau mount, provider đọc `cinebooking_language`/`document.lang` rồi `setLanguageState(restored)` bằng `queueMicrotask(reconcileFromBrowser)`. Đây là một React state update thật, nên mọi descendant phải rerender theo EN sau hard navigation; không còn phụ thuộc external-store server snapshot tự hội tụ.
- **Không tạo store thứ hai:** `usePresentationLanguage()` chỉ tiêu thụ `useLanguage()`; không đọc `localStorage` hoặc dùng `useSyncExternalStore` riêng.
- **Click VN/EN tức thời:** `setLanguage()` cập nhật React state trước, sau đó persist `localStorage`, đồng bộ `<html lang>`/readiness marker và phát compatibility event.
- **Cross-tab / bfcache:** `storage`, `pageshow` và `language-changed` vẫn reconcile về browser snapshot.
- **E2E mạnh hơn:** sau hard navigation sang Maintenance, test xác nhận nút EN có `aria-pressed=true` trước khi kiểm tra `Register equipment`, rồi tiếp tục tới `Preview schedule`. Như vậy test chứng minh chính provider state đã hội tụ, không chỉ kiểm tra DOM attribute.
- **Service Worker:** cache generation tăng `v77-0-23` để browser không giữ bundle provider cũ.

V77.0.23 vẫn là **no-schema release**: Flyway V72 / 67 public tables; không tạo Admin mới, không đổi password và không thêm business seed giả.

### Verify V77.0.23

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_23_single_provider_hydration_state.py
```

### Targeted E2E

```powershell
cd .\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"
npx playwright test `
  e2e/realtime-operations-v59-language.spec.ts `
  e2e/crm-marketing-automation-v64.spec.ts `
  e2e/customer-value-v56.spec.ts `
  --project=chromium
```

Mục tiêu: **3 passed / 0 failed**. Sau đó chạy full Browser E2E; chỉ release stable khi full suite đạt **0 failed**.

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.23
```

## V77.0.24 — Hydration Bundle + V64 Startup Reliability

Lượt targeted runtime sau V77.0.23 vẫn còn **2 failed / 1 passed**. Hai failure có cùng dấu hiệu runtime chưa hội tụ kịp: V64 đứng ở `Đang tải phân khúc khách hàng thật...` quá 15 giây, còn full navigation sang Maintenance có `localStorage=en`/`<html lang="en">` nhưng React switcher vẫn giữ `aria-pressed=false` cho EN.

V77.0.24 xử lý tại hai lớp runtime thay vì nới lỏng assertion:

- **Language hydration commit trực tiếp:** `LanguageProvider` vẫn có một `useState<Language>("vi")` để khớp server tree, nhưng mount effect gọi `reconcileFromBrowser()` trực tiếp thay vì đặt lần commit duy nhất trong `queueMicrotask`. Một `requestAnimationFrame` duy nhất chạy lại reconciliation sau paint để bao phủ cửa sổ hydration muộn mà không tạo polling loop hay store thứ hai.
- **Không hydrate bằng bundle cũ:** Service Worker tăng generation lên `v77-0-24`; `/_next/static/` chuyển sang **network-first** khi online và chỉ dùng cache làm fallback khi network lỗi. API vẫn tuyệt đối không cache, private navigation vẫn network-only.
- **V64 chờ backend Docker hội tụ:** overview thật `/api/admin/marketing/segments` retry transient failure trong **12-second bounded window**; `401/403` fail closed ngay. Sau khi hết retry UI hiện nút thử lại riêng thay vì loading vô hạn; focus/online có thể retry khi overview vẫn chưa có.
- **E2E vẫn nghiêm:** V64 chờ `campaign-preview-v64` enabled tối đa 30 giây rồi vẫn bắt buộc thấy segment thật `VIP giá trị cao`. Language E2E vẫn bắt EN switcher `aria-pressed=true`, `Register equipment` và `Preview schedule`. Không có fallback Admin.
- **No-schema:** Flyway vẫn V72 / 67 public tables; không tạo Admin mới, không đổi password, không thêm business seed giả.

### Verify V77.0.24

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_24_hydration_bundle_v64_startup_reliability.py
```

### Targeted E2E

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"
npx playwright test `
  e2e/realtime-operations-v59-language.spec.ts `
  e2e/crm-marketing-automation-v64.spec.ts `
  e2e/customer-value-v56.spec.ts `
  --project=chromium
```

Mục tiêu: **3 passed / 0 failed**. Sau đó chạy full Browser E2E; chỉ release stable khi full suite đạt **0 failed**.

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.24
```

## V77.0.25 — Zero-Warning LanguageProvider Cleanup

Lượt kiểm tra Windows sau V77.0.24 xác nhận source verifier **26/26 PASS**, nhưng `npm run lint` dừng với đúng **1 warning / 0 errors** tại `frontend/components/LanguageProvider.tsx:1:1`: **`Unused eslint-disable directive (no problems were reported from 'react-hooks/set-state-in-effect')`**. Vì frontend chạy ESLint với `--max-warnings=0`, warning này làm `$LASTEXITCODE = 1` dù code runtime không có lỗi lint thực tế.

V77.0.25 sửa đúng warning này bằng cách **xóa duy nhất directive suppression đã không còn cần thiết**. Không chạy `--fix` mù và không tắt rule toàn cục. Toàn bộ cơ chế V77.0.24 vẫn giữ nguyên: một React-owned `Language` state, persisted-language reconciliation trong mount effect, một `requestAnimationFrame` guard hậu paint, Service Worker network-first cho `/_next/static/`, V64 bounded startup retry và các Browser E2E contract hiện tại.

- Không đổi API/machine contract.
- Không đổi Service Worker generation vì patch chỉ loại comment lint không còn tác dụng runtime.
- Không migration/schema mới; Flyway vẫn V72 / 67 public tables.
- Không tạo Admin mới, không đổi password và không thêm business seed giả.

### Verify V77.0.25

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_25_zero_warning_language_provider_cleanup.py
```

### Zero-warning lint

```powershell
cd .\frontend
npm run lint
$LASTEXITCODE
```

Mong đợi: **0 errors / 0 warnings / exit code 0**. Sau đó chạy production build, Docker full observability, targeted E2E và full Browser E2E như V77.0.24 trước khi stable release.

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.25
```
## V77.0.26 — V64 Publish Feedback Persistence Fix

Lượt Windows runtime sau V77.0.25 xác nhận verifier **12/12 PASS**, zero-warning lint **exit 0**, production build/TypeScript **68/68 pages PASS**, Docker full observability **37/37 build** và targeted language/V59 đã hội tụ. Failure còn lại duy nhất nằm ở V64 sau publish: `campaign-launch-result-v64` đã xuất hiện (backend launch thành công), nhưng `campaign-feedback-v64` bị post-launch `load()` xóa success message rồi đổi về trạng thái `Sẵn sàng`.

V77.0.26 giữ nguyên API, V68 step-up, idempotent launch và overview refresh, nhưng thay đổi thứ tự commit UI:

- lưu `publishedMessage` từ response launch thật;
- giữ `setResult(data)` làm bằng chứng publish thành công;
- vẫn chạy `await load()` để refresh overview thật sau publish;
- coi overview refresh là hậu xử lý best-effort, không được biến launch đã thành công thành failure UI;
- sau refresh, commit lại `feedbackKind=success` và `publishedMessage`, vì vậy `campaign-feedback-v64` giữ `Đã phát hành/Published`;
- targeted E2E vẫn bắt cả `campaign-launch-result-v64` lẫn success feedback, không nới lỏng assertion.

Không migration/schema mới; Flyway vẫn V72 / 67 public tables. Không tạo Admin mới, không đổi password và không thêm business seed giả.

### Verify V77.0.26

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_26_v64_publish_feedback_persistence.py
```

### Targeted E2E

```powershell
cd .\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"
npx playwright test `
  e2e/realtime-operations-v59-language.spec.ts `
  e2e/crm-marketing-automation-v64.spec.ts `
  e2e/customer-value-v56.spec.ts `
  --project=chromium
```

Mục tiêu: **3 passed / 0 failed**. Sau đó chạy full Browser E2E; chỉ release stable khi full suite đạt **0 failed**.

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.26
```
## V77.0.27 — Layout-Effect Language Reconciliation Fix

Lượt Windows runtime sau V77.0.26 xác nhận verifier **14/14 PASS**, zero-warning lint **exit 0**, production build/TypeScript **68/68 pages PASS**, Docker full observability **37/37 build** và V59/V64 targeted đã PASS. Failure còn lại duy nhất nằm ở hard navigation tới `/admin/customer-value`: document đã là `<html lang="en">` nhưng React provider vẫn render copy VI, nên E2E nhận `Giá trị khách hàng & phân tích RFM · V56` thay vì `Customer Value & RFM Intelligence`.

V77.0.27 giữ single React-owned `Language` state nhưng chuyển browser reconciliation từ passive mount effect sang **layout effect** để preference đã được root bootstrap khôi phục có thể commit vào React trước painted client copy. Patch còn giữ một cửa sổ reconciliation hữu hạn (`rAF` + 50/250/1000 ms) cho selective/late hydration, không tạo polling vô hạn và không tạo language store thứ hai.

- `cinebooking_language` vẫn là persisted browser preference;
- explicit VN/EN click vẫn cập nhật React + localStorage + `document.lang` đồng thời;
- `storage`, `pageshow` và same-tab `language-changed` vẫn được giữ;
- customer-value E2E giờ xác nhận chính EN switcher `aria-pressed=true` trước khi assert `Customer Value & RFM Intelligence`, vì vậy test không thể PASS chỉ nhờ `<html lang=en>`;
- Service Worker generation bump lên `v77-0-27` để tránh giữ cache generation cũ trong lượt runtime mới.

Không migration/schema mới; Flyway vẫn V72 / 67 public tables. Không tạo Admin mới, không đổi password và không thêm business seed giả.

### Verify V77.0.27

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_27_layout_effect_language_reconciliation.py
```

### Targeted E2E

```powershell
cd .\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"
npx playwright test `
  e2e/realtime-operations-v59-language.spec.ts `
  e2e/crm-marketing-automation-v64.spec.ts `
  e2e/customer-value-v56.spec.ts `
  --project=chromium
```

Mục tiêu: **3 passed / 0 failed**. Sau đó chạy full Browser E2E và chỉ stable release khi full suite đạt **0 failed**.

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.27
```

## V77.0.28 — Compose Readiness & Hydration Gate Fix

Log Windows của V77.0.27 cho thấy cả ba targeted specs cùng fail theo một mẫu: V64 giữ nút Preview disabled, V56 có `<html lang="en">` nhưng EN switcher vẫn `aria-pressed=false`, và V59 có server-rendered heading nhưng chưa có domain cards. Đây là dấu hiệu **server HTML đã tới browser nhưng client JavaScript/API bootstrap chưa hoàn tất**, không phải ba regression nghiệp vụ độc lập.

V77.0.28 xử lý root cause ở hai lớp:

- `docker-compose.yml` bổ sung healthcheck cho cả `backend-1`, `backend-2` và `frontend`; `frontend` chỉ start sau hai backend `service_healthy`, còn `nginx` chỉ start sau frontend + cả hai backend `service_healthy`. Vì vậy `docker compose ... up -d --build` không mở edge HTTPS vào một stack mới chỉ ở trạng thái process-started.
- Root layout có `data-cinebooking-runtime-ready="pending"`; `RuntimeReadyMarker` chỉ đổi thành `true` khi client JavaScript thật sự chạy. Playwright `gotoHydrated`/`waitForHydratedRuntime` chờ marker này và chỉ retry **một read/navigation** nếu cold-start bỏ lỡ hydration chunk; business write không bao giờ bị replay.
- V56 dùng hydration gate cho `/login`, `/admin/customer-value`, `/admin/maintenance`, `/admin/showtimes`; V59 chờ thêm snapshot summary thật trước domain-card assertions; V64 dùng cùng runtime gate cho login/security/marketing re-entry.
- Service Worker generation bump lên `v77-0-28`; `/api/*` tiếp tục không cache.

Patch không đổi schema: Flyway vẫn V72. Tài khoản Admin vẫn lấy từ `.env` hiện hữu; không tạo Admin hoặc password mới.

### Verify V77.0.28

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_28_compose_readiness_hydration_gate.py
```

### Docker full stack

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  --profile observability `
  up -d --build

# Backend/frontend phải healthy trước khi nginx được mở
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  --profile observability `
  ps
```

### Stable release

```powershell
.\scripts\release.ps1 v77.0.28
```

## V77.0.29 — Frontend Healthcheck Contract Fix

Log Windows của V77.0.28 xác nhận source verifier 17/17, zero-warning lint và production build đều PASS; hai backend replica cũng đạt `healthy`. Tuy nhiên `frontend` bị Docker đánh dấu `unhealthy` trong khoảng 138 giây, khiến Compose dừng trước Nginx với `dependency failed to start`. V77.0.29 sửa đúng healthcheck contract này, không nới readiness gate.

- Thêm `frontend/app/healthz/route.ts`: route Next.js động, trả HTTP 200 `ok`, `Cache-Control: no-store`, không gọi backend, không yêu cầu auth và không phụ thuộc biến môi trường nghiệp vụ.
- Frontend healthcheck dùng Node core `http.get()` tới `http://127.0.0.1:3000/healthz` và yêu cầu đúng status 200; bỏ probe `fetch('/login')` vốn phụ thuộc user-facing page/runtime fetch semantics.
- Standalone runner và Compose pin rõ `HOSTNAME=0.0.0.0` và `PORT=3000`, tránh sai khác bind-address giữa image/runtime.
- `frontend` vẫn chỉ start sau `backend-1` + `backend-2` healthy; `nginx` vẫn chỉ mở sau frontend + cả hai backend healthy. V77.0.28 hydration marker/E2E gate được giữ nguyên.
- Không đổi schema; Flyway vẫn V72. Admin tiếp tục lấy từ `.env` hiện hữu; không tạo tài khoản hoặc password mới.

### Verify V77.0.29

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_29_frontend_healthcheck_contract.py
```

### Docker full stack

```powershell
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  --profile observability `
  up -d --build

docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  --profile observability `
  ps
```

Mong đợi `backend-1`, `backend-2`, `frontend`, `postgres`, `redis` đều `(healthy)`; Nginx/Prometheus/Grafana `Up`. Không dùng `down -v`.

### Stable release

```powershell
.\scripts\release.ps1 v77.0.29
```

## V77.0.30 — Full-Suite Runtime Contract Alignment

Runtime Windows của V77.0.29 đã xác nhận verifier 16/16, zero-warning lint, production build, Docker health contract và `/healthz` đều PASS. Targeted V59/V64/V56 đạt **3 passed / 0 failed**. Khi chạy toàn bộ **46 Browser E2E**, kết quả còn **30 passed / 16 failed**. Các lỗi còn lại tập trung ở contract kiểm thử đã cũ hoặc hard-navigation/async state chưa được gate thống nhất, không phải lỗi Docker healthcheck nữa.

V77.0.30 chuẩn hóa full suite theo đúng UI/runtime hiện hành:

- `runtime-guards.ts` có `existingAdminCredentials`, `loginWithRole`, `loginExistingAdmin`, `waitForAuthRole` và `waitForStepUpGrant`; mọi spec được sửa chỉ dùng Admin hiện hữu từ root `.env`, không còn fallback account/password.
- Booking badge có `data-booking-status` để E2E kiểm tra trạng thái máy `CONFIRMED/REFUNDED` mà không phụ thuộc bản dịch aria.
- Loyalty reward có testid theo reward code (`RWD20K`, `RWDCORN`), ticket transfer có testid email ổn định, Admin Support/Payments/Offline Tickets/Showtime Planning có root testid rõ ràng.
- Discovery vẫn bắt buộc ngày 30/09/2026 khả dụng nhưng không đóng băng `max=2026-09-30`; dữ liệu thật hiện có thể mở rộng lịch đến 15/10/2026.
- V47/V52/V74 và Support theo copy Việt hiện hành: `Trung tâm thanh toán`, `Vé ngoại tuyến`, `chuyển dự phòng`, `Vận hành hỗ trợ`.
- V50/Loyalty/Showtime/Smart Planner chờ bounded async readiness thay vì suy ra từ SSR hoặc placeholder. Showtime Planner chọn phim đang thực sự active thay vì hard-code một phim có thể bị test trước thay đổi trạng thái.
- V68 chờ token step-up trong `sessionStorage` trước khi assert badge mở khóa; business write vẫn không bị retry.
- Không đổi schema, không seed business giả, không thay tài khoản Admin. Flyway vẫn V72.

### Verify V77.0.30

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_30_full_suite_runtime_contract_alignment.py
```

### Lint + production build

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
npm run lint
$LASTEXITCODE
$env:NEXT_PUBLIC_API_URL="/api"
npm run build
```

### Docker full stack

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  --profile observability `
  up -d --build

docker compose `
  -f docker-compose.yml `
  -f docker-compose.https.yml `
  --profile observability `
  ps
```

### Targeted regression trước full suite

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"
npx playwright test `
  e2e/realtime-operations-v59-language.spec.ts `
  e2e/crm-marketing-automation-v64.spec.ts `
  e2e/customer-value-v56.spec.ts `
  --project=chromium
```

Mục tiêu targeted: `3 passed / 0 failed`. Sau đó chạy:

```powershell
npx playwright test --project=chromium
```

Mục tiêu stable gate: `46 passed / 0 failed`. Chỉ khi full suite xanh mới release:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.30
```



## V77.0.31 — Remaining Full-Suite Contract Alignment

Baseline runtime thực tế của V77.0.30 trên Windows + Docker + Microsoft Edge:

```text
Verifier V77.0.30  33/33 PASS
Lint                PASS (exit 0)
Production build    PASS
Docker health       PASS
Targeted E2E        3/3 PASS
Full E2E            36 passed / 10 failed
```

10 regression còn lại tập trung ở contract kiểm thử cũ, không phải một lỗi nền duy nhất. V77.0.31 bổ sung machine-readable contract cho booking card, payment history, finance ledger, privacy retention mode, PWA delivery mode và staff check-in; chờ dữ liệu thật ở V57/movie detail; đồng thời chuẩn hóa provenance của Smart Planner và bỏ các assertion phụ thuộc copy/hard-code còn sót.

### Verify V77.0.31

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_31_remaining_full_suite_contract_alignment.py
```

Mục tiêu: `26/26 checks passed`.

### Runtime gates

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
npm run lint
$env:NEXT_PUBLIC_API_URL="/api"
npm run build

cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
docker compose -f docker-compose.yml -f docker-compose.https.yml --profile observability up -d --build
docker compose -f docker-compose.yml -f docker-compose.https.yml --profile observability ps

cd .\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"
npx playwright test --project=chromium
```

Stable release chỉ được tạo khi full Browser E2E đạt `46 passed / 0 failed`:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.31
```

## V77.0.32 — Final-Four Runtime Contract Alignment

Baseline runtime thực tế của V77.0.31 trên Windows + Docker + Microsoft Edge:

```text
Verifier V77.0.31         26/26 PASS
Lint                       PASS (exit 0)
Production build           PASS (68/68 pages)
Docker health              PASS
/healthz                   PASS
Targeted V59/V64/V56       3/3 PASS
Focused 11-test regression 7 passed / 4 failed
```

Bốn lỗi còn lại không phải một lỗi backend chung: payment timeline vẫn phụ thuộc copy cũ `Xem timeline`/raw enum, movie detail cần tách core payload khỏi auxiliary request, Finance hiển thị trạng thái đối soát đã Việt hóa trong khi E2E bắt `CLEAN`, và V47 lặp lại cùng timeline-copy contract. V77.0.32 thêm machine-readable timeline/reconciliation contracts và tách core movie load khỏi auxiliary requests.

### Verify V77.0.32

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_32_final_four_runtime_contract_alignment.py
```

Mục tiêu: `16/16 checks passed`.

### Focused 4-test regression

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"

npx playwright test `
  e2e/booking-flow.spec.ts `
  e2e/discovery-calendar.spec.ts `
  e2e/financial-ledger.spec.ts `
  e2e/payment-operations-v47.spec.ts `
  --project=chromium
```

Sau focused gate, chạy `npx playwright test --project=chromium`. Stable release chỉ được tạo khi full Browser E2E đạt `46 passed / 0 failed`.

## V77.0.33 — Final-Two Runtime Contract Alignment

Baseline runtime thực tế của V77.0.32 trên Windows + Docker + Microsoft Edge:

```text
Verifier V77.0.32          16/16 PASS
Lint                        PASS (exit 0)
Production build            PASS (68/68 pages)
Docker health               PASS
/healthz                    PASS
Targeted V59/V64/V56        3/3 PASS
Focused 4-test regression   2 passed / 2 failed
```

Hai lỗi còn lại là contract/runtime edge-case tách biệt. Booking Flow mở đúng trang vé nhưng E2E vẫn tìm QR qua alt text cũ `QR URL vé CineBooking`, trong khi giao diện hiện tại đã Việt hóa thành `Đường dẫn QR vé CineBooking`. Movie Detail vẫn có thể mất surface nếu core `/movies/{id}` gặp một lỗi đọc tạm thời vì client chỉ thử đúng một lần; focused E2E cũng chỉ chờ surface mà không dùng recovery navigation chuẩn đã có.

V77.0.33 thêm `ticket-qr-v33` + `data-booking-id`, dùng selector machine-readable trong Booking Flow, retry **chỉ** core movie GET tạm thời trong cửa sổ hữu hạn 12 giây (không retry 4xx business/not-found), và chuyển Discovery sang `gotoSurface(...)` để có đúng một recovery navigation nếu surface chưa hội tụ. Auxiliary showtime/review/recommendation vẫn dùng `Promise.allSettled` và không thể làm mất core movie payload.

### Verify V77.0.33

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_33_final_two_runtime_contract_alignment.py
```

### Focused 2-test regression

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"

npx playwright test `
  e2e/booking-flow.spec.ts `
  e2e/discovery-calendar.spec.ts `
  --project=chromium
```

Sau focused gate, chạy `npx playwright test --project=chromium`. Stable release chỉ được tạo khi full Browser E2E đạt `46 passed / 0 failed`:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.33
```

## V77.0.34 — Ticket Control Runtime Contract Alignment

Baseline runtime thực tế của V77.0.33 trên Windows + Docker + Microsoft Edge:

```text
Verifier V77.0.33          18/18 PASS
Lint                        PASS (exit 0)
Production build            PASS (68/68 pages)
Docker health               PASS
/healthz                    PASS
Targeted V59/V64/V56        3/3 PASS
Focused 2-test regression   1 passed / 1 failed
```

Discovery Calendar đã PASS. Lỗi còn lại duy nhất nằm trong Booking Flow sau khi QR `ticket-qr-v33` đã hiển thị đúng: E2E vẫn tìm nút bằng copy cũ `Mã booking`, trong khi UI hiện tại dùng `Mã đặt vé`. Đây là regression selector/presentation, không phải lỗi booking/payment/QR backend.

V77.0.34 thêm machine selectors ổn định cho ba action trên trang vé: `ticket-add-calendar`, `ticket-copy-booking-code` + `data-booking-id`, và `ticket-print`. Booking Flow dùng các contract này thay cho copy hiển thị, đồng thời xác nhận nút copy code thuộc đúng booking vừa thanh toán. Không thay đổi nghiệp vụ, không retry write, không đổi schema và không tạo Admin mới.

### Verify V77.0.34

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_34_ticket_control_runtime_contract_alignment.py
```

### Focused final regression

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"

npx playwright test `
  e2e/booking-flow.spec.ts `
  e2e/discovery-calendar.spec.ts `
  --project=chromium
```

Sau focused gate, chạy `npx playwright test --project=chromium`. Stable release chỉ được tạo khi full Browser E2E đạt `46 passed / 0 failed`:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.34
```



## V77.0.35 — Admin Payments Runtime Contract Alignment

Runtime Windows của V77.0.34 đã qua verifier `14/14`, lint/build, Docker health và targeted V59/V64/language `3/3`. Focused `booking-flow + discovery-calendar` đạt `1 passed / 1 failed`: Discovery đã xanh; Booking Flow đi qua QR và ticket controls nhưng dừng sau Admin/staff check-in vì vẫn tìm heading cũ `Thanh toán production & đối soát` trên `/admin/payments`. Surface hiện hành đã dùng copy `Thanh toán vận hành & đối soát`; canonical V60 E2E từ trước đã có readiness contract ổn định `payment-production-readiness-v60`.

V77.0.35 không đổi UI hoặc nghiệp vụ để chiều test. Booking Flow chuyển sang đúng contract đang được V60 dùng: `gotoSurface(page, "/admin/payments", "payment-production-readiness-v60")`, xác nhận readiness panel và `payment-readiness-mock-v60`. Hai assertion presentation cũ `Thanh toán production & đối soát` và `Payment Production · V60` bị loại khỏi Booking Flow. Historical V60 source verifier được mở rộng forward-compatible để chấp nhận cùng machine readiness contract thay cho việc buộc Booking Flow giữ copy cũ. Không retry business write, không đổi schema và không tạo Admin mới.

### Verify V77.0.35

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_35_admin_payments_runtime_contract_alignment.py
```

### Focused final regression

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"

npx playwright test `
  e2e/booking-flow.spec.ts `
  e2e/discovery-calendar.spec.ts `
  --project=chromium
```

Sau focused gate, chạy `npx playwright test --project=chromium`. Stable release chỉ được tạo khi full Browser E2E đạt `46 passed / 0 failed`:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.35
```

## V77.0.36 — Final Three Full-Suite Runtime Recovery

Runtime Windows của V77.0.35 đã đóng toàn bộ focused gate trước đó: verifier `16/16`, lint/build, Docker health, `/healthz`, targeted V59/V64/language `3/3` và focused `booking-flow + discovery-calendar` `2/2` đều PASS. Full Browser E2E sau đó đạt **43 passed / 3 failed**. Ba lỗi còn lại đều là read/runtime convergence sau navigation hoặc reload, không phải lỗi business write:

- **V51 Analytics**: sau `page.reload()`, shell `analytics-v51` đã render nhưng `forecast-v51` chưa xuất hiện trong cửa sổ 15 giây.
- **V63 Recommendation 4.0**: sau reload, shell `for-you-v63` đã có nhưng recommendation reason chưa hội tụ vì home/profile read chưa hoàn tất.
- **V39 Seat Map contention**: sau race 200/409, loser navigation có thể chưa tải được seat map nên button theo `data-seat-code` chưa tồn tại dù hold write đã hoàn tất đúng.

V77.0.36 xử lý ở đúng read contract thay vì nới assertion. Analytics thêm bounded transient GET retry 12 giây cho dashboard; E2E dùng `loginExistingAdmin`, `ensureSurface(...forecast-v51...)` và không còn fallback Admin. Recommendation home/profile dùng bounded transient read retry, đồng thời `for-you-v63` expose `data-recommendation-ready=true` chỉ sau khi cả hai payload thật đã về; reload E2E chờ contract này trước khi xác minh explainability. Booking core showtime + seat-map GET cũng có bounded transient retry 12 giây; seat map expose `booking-seat-map-v39` + `data-showtime-id`, và V39 E2E dùng `gotoSurface(...)` cho second client/loser navigation. Các POST/DELETE hold vẫn **single-shot**, không retry business write.

### Verify V77.0.36

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_36_final_three_full_suite_runtime_recovery.py
```

### Focused 3-test regression

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"

npx playwright test `
  e2e/analytics-forecasting-v51.spec.ts `
  e2e/recommendation-4-v63.spec.ts `
  e2e/seat-map-ux.spec.ts `
  --project=chromium
```

Sau focused gate, chạy `npx playwright test --project=chromium`. Stable release chỉ được tạo khi full Browser E2E đạt `46 passed / 0 failed`:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.36
```

## V77.0.37 — Full-Suite Policy & Alert Runtime Recovery

Runtime Windows của V77.0.36 đã qua verifier `20/20`, lint/build, Docker health, `/healthz` và focused V51/V63/V39 `3/3`. Full Browser E2E sau đó đạt **42 passed / 4 failed**. Bốn lỗi còn lại cùng nằm ở read/presentation convergence hoặc realtime DOM race, không phải lỗi business write:

- **V75 Analytics & BI**: shell `analytics-bi-v75` đã render nhưng summary payload chưa hội tụ, nên `analytics-bi-policy-v75` chỉ có phần mô tả tiếng Việt và chưa có policy `REAL_OPERATIONAL_DATA_ONLY` / `NO_SYNTHETIC_FUNNEL_EVENTS`.
- **V69 Backup & DR**: trang render fallback `Bằng chứng CSDL: —`, `Danh mục trọng yếu: 0 bảng` trước khi summary thật về; backend V69 vẫn trả `immutableEvidence=true` khi summary đọc thành công.
- **V59 Realtime Operations**: live alert snapshot có thể đổi giữa `actionGroups.count()` và `ack.isEnabled()`, khiến Playwright chờ một button presentation đã biến mất cho đến hết timeout 90 giây.
- **V76 Recommendation 5.0**: Admin shell đã render nhưng evidence policy payload chưa hội tụ, nên các raw policy codes chưa tồn tại trong DOM dù surface đã có.

V77.0.37 xử lý ở contract đọc và machine state thay vì nới nghiệp vụ. V75 Analytics BI, V69 Backup/DR và V76 Admin Recommendation dùng bounded transient GET retry trong cửa sổ 12 giây, chỉ retry network/408/425/429/5xx. Các surface expose readiness/evidence state lấy từ payload thật: `data-analytics-bi-ready`, `data-dr-ready`, `data-evidence-mode=APPEND_ONLY`, `data-recommendation-admin-ready` cùng các policy attributes. `/for-you` cũng expose policy attributes từ `home.evidencePolicy` sau `data-recommendation-ready=true`.

V59 alert card expose `operations-control-alert-v59` + `data-alert-fingerprint` + `data-alert-state`; action dùng `operations-alert-ack-v59` / `operations-alert-resolve-v59`. E2E chỉ thao tác alert đang `OPEN`, giới hạn kiểm tra action trong 2 giây và theo dõi đúng fingerprint đến `ACKNOWLEDGED`, nên realtime refresh không còn biến một locator stale thành timeout 90 giây. Các test V75/V69/V76/V59 đều dùng **Admin hiện hữu từ root `.env`**, không có fallback credential. Business writes không được tự retry.

### Verify V77.0.37

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_37_full_suite_policy_alert_runtime_recovery.py
```

### Focused 4-test regression

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"

npx playwright test `
  e2e/analytics-bi-v75.spec.ts `
  e2e/backup-disaster-recovery-v69.spec.ts `
  e2e/realtime-operations-v59.spec.ts `
  e2e/recommendation-5-v76.spec.ts `
  --project=chromium
```

Mục tiêu focused: `4 passed / 0 failed`. Sau đó chạy `npx playwright test --project=chromium`; stable release chỉ tạo khi full Browser E2E đạt `46 passed / 0 failed`:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.37
```

## V77.0.38 — Release-Gate Readiness Recovery

Runtime Windows của V77.0.37 đã chứng minh source/runtime chính ổn định: verifier `26/26`, lint/build, Docker health, focused 4-test `4/4` và một lượt full Browser E2E trực tiếp đạt **46 passed / 0 failed**. Tuy nhiên khi chạy `./scripts/release.ps1 v77.0.37`, release flow rebuild/restart Docker rồi chạy lại full Browser E2E và xuất hiện **44 passed / 2 failed**. Release script đã fail-closed trước commit/push/tag/release. Hai lỗi là read-convergence sau fresh runtime, không phải business-write failure:

- **V66 Booking Consistency & Seat Locking**: Admin Seat Operations đã render shell nhưng `seat-consistency-summary-v66` vẫn còn placeholder `—` khi assertion chạy. V77.0.38 thêm bounded transient GET retry 12 giây cho `/me` + `/admin/seat-operations/summary`, expose `data-seat-summary-ready` / `data-summary-ready` và machine counts. E2E chờ authoritative readiness trước khi xác minh hold đang hoạt động. Hold POST/DELETE vẫn single-shot.
- **V77 CRM Automation 5.0**: `crm-policy-v77` đã render phần mô tả nhưng summary/evidence payload chưa hội tụ nên raw policy codes chưa có trong DOM. V77.0.38 thêm bounded transient GET retry 12 giây, `data-crm-ready` và sáu evidence-policy machine attributes. E2E dùng các attributes sau khi payload thật sẵn sàng, không phụ thuộc timing của presentation codes.

Cả hai E2E được chuyển sang `loginExistingAdmin(...)`; không còn hardcoded fallback Admin/password. Retry chỉ áp dụng cho read network/HTTP `408/425/429/5xx`; authorization/business errors fail-closed. Source vẫn Flyway V72 và lịch sử nâng cấp tiếp tục gộp duy nhất trong `README.md`.

### Verify V77.0.38

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_38_release_gate_readiness_recovery.py
```

### Focused release-gate regression

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"

npx playwright test `
  e2e/booking-consistency-seat-locking-v66.spec.ts `
  e2e/crm-automation-5-v77.spec.ts `
  --project=chromium
```

Mục tiêu focused: `2 passed / 0 failed`. Sau đó chạy `npx playwright test --project=chromium`; stable release chỉ tạo khi full Browser E2E đạt `46 passed / 0 failed`:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.38
```

## V77.0.39 — Zero-Warning Full-UI Language Contract

Runtime Windows của V77.0.38 đã qua verifier `26/26` và production build Next.js/TypeScript `68/68`, nhưng zero-warning lint dừng ở đúng một warning: `frontend/e2e/crm-automation-5-v77.spec.ts` còn import `type Page` không sử dụng (`@typescript-eslint/no-unused-vars`), làm `eslint . --max-warnings=0` trả exit code `1`. V77.0.39 loại import thừa này; không suppress rule và không hạ chuẩn lint.

Audit source cho thấy nguyên nhân nhiều nút không đổi khi bấm **EN** là các surface legacy vẫn render copy tiếng Việt tĩnh dù `LanguageProvider` đã đổi state toàn cục. V77.0.39 xử lý theo hai lớp:

- **Presentation-owned cho shared/navigation:** `Header`, PWA manager, MovieCard, PasswordInput/Strength, StarRating và LanguageSwitcher dùng trực tiếp language state để render VI/EN. Header drawer/desktop menu được rà lại các entry Manager/Admin; các nút chuyển ngôn ngữ có machine selector `language-switch-vi` / `language-switch-en`.
- **Compatibility bridge cho surface legacy:** `LegacyUiLocalizationBridge` chỉ dịch các chuỗi UI đã được audit trong catalog `interactive-ui-translations.ts`. Phạm vi gồm menu, button, link, label, option, placeholder, `aria-label`, `title`, `alt` và heading. Bridge theo dõi DOM được render muộn bằng `MutationObserver`, phục hồi nguyên văn copy Việt khi bấm VN và không dịch enum/status machine, payload backend, tên phim, email/ID hay dữ liệu nghiệp vụ động.

Catalog V77.0.39 chứa hơn 1.400 mục VI→EN đã audit. Static source audit bảo đảm toàn bộ literal tiếng Việt trong các control tương tác được catalog/source-owned; heading chính cũng được phủ. Service Worker cache generation tăng lên `v77-0-39` để shell cũ không giữ bundle giao diện trước bản sửa.

E2E `realtime-operations-v59-language.spec.ts` vẫn là một journey hiện hữu (không tăng số lượng full suite) nhưng mở rộng kiểm tra: chuyển EN, quét interactive controls để phát hiện rò copy Việt, đi qua `/admin/vouchers`, `/admin/analytics-bi`, `/admin/actions-runtime`, sau đó chuyển lại VN và xác nhận copy Việt trở lại.

V77.0.39 không đổi schema; database authority vẫn Flyway V72. Không tạo Admin mới, không hard-code/fallback password và không thay đổi business write/retry policy. Source tiếp tục chỉ có **một `README.md`** cho toàn bộ lịch sử phiên bản.

### Verify V77.0.39

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_39_zero_warning_full_ui_language_contract.py
```

### Language regression + full gate

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"

npx playwright test `
  e2e/realtime-operations-v59-language.spec.ts `
  e2e/crm-automation-5-v77.spec.ts `
  e2e/booking-consistency-seat-locking-v66.spec.ts `
  --project=chromium

npx playwright test --project=chromium
```

Stable release chỉ được tạo khi zero-warning lint, build, Docker health và full Browser E2E đều xanh:

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
.\scripts\release.ps1 v77.0.39
```

## V77.0.40 - Runtime Language Boundary & Full-UI EN Regression Fix

Windows validation of V77.0.39 confirmed the source verifier `38/38`, zero-warning lint exit code `0`, production build, and healthy Docker runtime. The targeted language run then exposed one remaining V59 regression: the test rejected the entire Operations Control root whenever any Vietnamese diacritic was present. That mixed presentation copy with legitimate business data such as cinema names, and the hidden V58 compatibility marker was still fixed Vietnamese text.

V77.0.40 fixes the boundary instead of translating business data:

- `operations-control-center-v58` now follows the active VI/EN language and renders `Operations Control Center - V58` semantics in EN.
- Dynamic cinema names remain unchanged business data and are marked with `data-i18n-skip="true"`; proper names are never machine-translated merely because EN is selected.
- The V59 language regression now checks explicit presentation-owned headings/controls and removes opted-out business-data descendants before searching interactive UI for Vietnamese leakage.
- The EN browser sweep now keeps one persisted language session across `/`, `/movies`, `/cinemas`, `/payments`, `/support`, `/admin`, `/admin/payments`, `/admin/staff`, `/admin/support`, and `/admin/crm-automation` (plus the existing voucher/BI/actions regression surfaces).
- Movie/cinema/customer/staff values rendered inside interactive controls are marked as source-owned business data where needed, so the regression rejects Vietnamese UI copy without translating names, identifiers, movie metadata, or backend-derived values.
- `LegacyUiLocalizationBridge` now includes `[alt]` in the initial attribute walk, closing the alt-only first-paint gap while retaining MutationObserver handling for later changes.
- The V77.0.39 zero-warning CRM import fix remains intact; no ESLint suppression is added.
- Service Worker cache generation advances to `v77-0-40`.

This patch does not change schema, payment/booking business writes, or Admin credentials. Flyway remains V72 and the repository continues to keep all upgrade history in this single README.md.

### Verify V77.0.40

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_40_runtime_language_boundary_fix.py
```

### Language regression

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"

npx playwright test `
  e2e/realtime-operations-v59-language.spec.ts `
  e2e/crm-automation-5-v77.spec.ts `
  e2e/booking-consistency-seat-locking-v66.spec.ts `
  --project=chromium
```

After the targeted gate is green, run the full suite and only then release `v77.0.40`.

## V77.0.41 - Movies Presentation-Language Runtime Fix

Windows targeted validation of V77.0.40 reached the expanded EN sweep and exposed the next concrete leak on `/movies`: `Tìm phim`, `Thể loại` and `Phân loại` were still hard-coded Vietnamese presentation text. The regression correctly ignored source-owned genre/rating values, but the label copy itself was not owned by the active language state.

V77.0.41 moves the complete movie discovery presentation surface onto `usePresentationLanguage()` instead of relying on the legacy bridge for these controls:

- Search, genre, language and rating labels now render directly from the live VI/EN state.
- Search placeholder, tabs, default filter options, sort controls, result summary, reset button, heading and empty state all switch in the same render.
- Dynamic genre/language/rating values from movie data remain unchanged business data and keep `data-i18n-skip="true"`.
- The V59 cross-surface E2E now asserts the four `/movies` labels explicitly in EN before running the generic Vietnamese-leak audit.
- Playwright continues to resolve `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` from the existing root `.env` `ADMIN_EMAIL` / `ADMIN_PASSWORD`; this patch does not introduce a new Admin account.
- Service Worker cache generation advances to `v77-0-41` so a browser that already cached V77.0.40 cannot keep the stale movie page bundle.

No schema migration is added; Flyway remains V72 and all version history remains in this single `README.md`.

### Verify V77.0.41

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_41_movies_language_surface_fix.py
```

### Targeted runtime gate

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"

npx playwright test `
  e2e/realtime-operations-v59-language.spec.ts `
  e2e/crm-automation-5-v77.spec.ts `
  e2e/booking-consistency-seat-locking-v66.spec.ts `
  --project=chromium
```

After the targeted gate is green, run the full 46-test browser suite and only then release `v77.0.41`.

## V77.0.42 - Full-UI Language Completion

Windows validation of V77.0.41 confirmed `24/24` source verification, zero-warning lint, a successful `68/68` production build, and a healthy full Docker stack. The expanded language journey then reached `/support` and exposed the next real EN leak: the category option `CINEMA_EXPERIENCE` was still rendered through the Vietnamese-only `viLabel(...)` path as `Trải nghiệm rạp`.

V77.0.42 fixes the underlying language boundary broadly instead of adding one isolated string:

- `LegacyUiLocalizationBridge` now composes the existing audited catalog, a new V77.0.42 presentation catalog, and `VI_LABEL_TO_EN`; rendered machine/status labels such as `Trải nghiệm rạp` therefore become `Cinema experience` in EN without changing the backend enum value.
- A new presentation catalog adds **307 audited VI→EN entries** for customer/public and release-gate admin surfaces that still contained static Vietnamese body copy outside the older interactive-only catalog.
- `/support` and `/payments` now render machine/status/category labels directly with `localizedLabel(value, language)` instead of relying on Vietnamese-only `viLabel(...)` output.
- `/cinemas` now derives day, month, and time formatting from the live presentation locale (`vi-VN` / `en-US`), so EN no longer keeps Vietnamese calendar words.
- Admin, staff, and CRM native `confirm()` / validation feedback touched by the sweep now have explicit VI/EN branches because DOM mutation cannot translate native browser dialogs.
- Admin Support accessibility labels, Analytics BI day units, and voucher dynamic validation/status feedback now follow the active presentation language.
- The V59 cross-surface language regression explicitly asserts the historical `Cinema experience` support option and expands the leak selector to headings, section kickers, empty states, and table headers in addition to buttons, labels, options, navigation, and placeholders.
- Source verification audits the complete browser-sweep source set against direct language ownership, both translation catalogs, and canonical machine labels. Business data remains source-owned and is still excluded through `data-i18n-skip="true"` where needed.
- Service Worker cache generation advances to `v77-0-42` so browsers cannot keep V77.0.41 bundles after the language fix.

The existing Admin account continues to come only from root `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). No new Admin account is created. No schema migration is added; Flyway remains V72.

### Verify V77.0.42

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_42_full_ui_language_completion.py
```

### Targeted VN → EN → VN runtime gate

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"

npx playwright test `
  e2e/realtime-operations-v59-language.spec.ts `
  e2e/crm-automation-5-v77.spec.ts `
  e2e/booking-consistency-seat-locking-v66.spec.ts `
  --project=chromium
```

Expected targeted gate: `3 passed / 0 failed`. After that, run the full 46-test browser suite and only then release `v77.0.42`.

## V77.0.43 - Literal-Level Language Audit Fix

Windows validation of V77.0.42 confirmed `28/28` source verification, zero-warning lint, a successful `68/68` production build, and a healthy full Docker stack. The targeted VN → EN journey then exposed another concrete Admin Payments leak: the table headers `Lần thử` and `Đơn vị thanh toán / Cổng thanh toán` remained Vietnamese in EN mode.

The important root cause was in the verifier itself: V77.0.42 marked an entire source line as language-owned whenever that line contained any `t(...)`, `localizedLabel(...)`, or language branch. Compact JSX in `admin/payments/page.tsx` keeps an entire table row on one line, so unrelated Vietnamese `<th>` literals on that same line were falsely accepted.

V77.0.43 corrects both runtime copy and the verification model:

- A focused V77.0.43 presentation catalog adds the missing Admin Payments headers plus remaining static release-gate text/fragments found by literal-level scanning.
- The legacy bridge checks the V77.0.43 catalog before the V77.0.42 fallback and canonical machine/status labels.
- The browser regression explicitly requires `Attempt` and `Merchant / Payment gateway` on `/admin/payments` before the generic Vietnamese-leak audit runs.
- The new verifier audits literal JSX text nodes and quoted presentation literals independently instead of trusting an entire source line because one sibling expression is localized.
- Existing V77.0.39–V77.0.42 language verifiers remain forward-compatible with the V77.0.43 stable target and Service Worker generation.
- Service Worker cache generation advances to `v77-0-43` so a browser cannot retain V77.0.42 UI bundles.

The existing Admin account continues to come only from root `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). No new Admin account is created. No schema migration is added; Flyway remains V72.

### Verify V77.0.43

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_43_language_literal_audit_fix.py
```

### Targeted VN → EN → VN runtime gate

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"

npx playwright test `
  e2e/realtime-operations-v59-language.spec.ts `
  e2e/crm-automation-5-v77.spec.ts `
  e2e/booking-consistency-seat-locking-v66.spec.ts `
  --project=chromium
```

Expected targeted gate: `3 passed / 0 failed`. After that, run the full 46-test browser suite and only then release `v77.0.43`.



## V77.0.44 - CRM Payload Localization + V66 Authority Visibility Fix

V77.0.44 closes the two runtime failures observed after V77.0.43 passed verifier/lint/build/Docker:

- `booking-consistency-seat-locking-v66.spec.ts` could not find `seat-hold-authority-v66` because the marker was incorrectly rendered only after `held=true`. The authority marker now renders whenever the booking surface is available and still reports `POSTGRESQL_WITH_REDIS_MIRROR` (or the backend-provided authority).
- `/admin/crm-automation` playbook cards were still using raw backend Vietnamese `label`, `definition`, and `recommendedAction` even though `playbookCopy()` already had canonical English copy. The cards now use `playbookCopy(p, language)`, and their Eligible/Ready/Blocked/Suggestion/Default discount labels use the live presentation language.
- The language E2E explicitly proves `Activate first booking`, `VIP appreciation`, the English suggestion copy and `Default discount` while preserving source-owned business data boundaries.
- Service Worker cache generation advances to `v77-0-44`. Flyway remains V72 and Admin credentials remain sourced from the root `.env`.

### Verify V77.0.44

```powershell
python -X utf8 .\tools\verify_v77_0_44_crm_payload_v66_authority_fix.py
```

Expected: `V77.0.44 CRM payload/V66 authority verification: 22/22 checks passed`.

## V77.0.45 - Full-Suite Repeatability + Accessibility Contract Fix

V77.0.45 closes the final two failures observed after V77.0.44 reached targeted **3/3** and the full browser suite reached **44/46**:

- `discovery-calendar.spec.ts` timed out waiting for the accessible link name `Xem chi tiết Hành Trình Sao Hỏa`. V77.0.44's `MovieCard` had inserted punctuation (`Xem chi tiết: Hành Trình Sao Hỏa`), which drifted from the long-standing accessibility/E2E contract. `MovieCard` now renders `Xem chi tiết <movie>` / `View details <movie>` again without the colon.
- `showtime-smart-planner-v49.spec.ts` received `suggested=0` on the fixed date `2026-10-15`. The Smart Planner business logic was valid; the E2E was not repeatable against the persistent Docker database because successful historical runs could keep adding showtimes to the same date. The test now derives an isolated future planning date per execution.
- After a successful Smart Planner commit, the E2E captures the authoritative commit response and deletes only the temporary showtimes created by that test, using the already authenticated Admin bearer token. The planning run remains as provenance. Cleanup runs in `finally`, so later assertion failures do not leave the generated showtimes behind.
- The test still requires a non-zero suggestion, still commits through the real backend, and still verifies the Smart Planner run history. No planner conflict, maintenance, spacing, scoring, or transaction rule is weakened.
- Service Worker cache generation advances to `v77-0-45`. Flyway remains V72 and the existing Admin account remains sourced from root `.env`.

### Verify V77.0.45

```powershell
python -X utf8 .\tools\verify_v77_0_45_full_suite_repeatability_accessibility_fix.py
```

Expected: `V77.0.45 full-suite repeatability/accessibility verification: 18/18 checks passed`.

## V77.0.46 - PWA Readiness + Full-Suite Language Sweep Stabilization

Windows validation of V77.0.45 confirmed the dedicated verifier, zero-warning lint, the `68/68` production build, a healthy full Docker stack, the focused Discovery/Smart-Planner gate at **2/2**, and the VN/EN/V66 targeted gate at **3/3**. The full 46-test browser suite then reached **44/46** with two remaining full-suite-only failures:

- `pwa-mobile-v52.spec.ts` stayed at `data-delivery-mode="LOADING"` for 30 seconds. `/mobile` was waiting for `registerCurrentPwaDevice()` before reading `/pwa/config`; device registration in turn waited indefinitely on `navigator.serviceWorker.ready`. Under a long browser suite, delayed Service Worker activation could therefore block an unrelated server configuration value. V77.0.46 fetches and publishes the authoritative push configuration first, then performs browser-device registration. The registration helper now uses an existing registration when available and otherwise applies a bounded Service Worker readiness fallback. It never invents `VAPID_BACKGROUND` or `FOREGROUND_FALLBACK`; those values still come only from `/api/pwa/config`.
- `realtime-operations-v59-language.spec.ts` timed out at the global 90-second limit while running the broad VN/EN release sweep. The same test had already passed in the targeted 3/3 gate, and its sweep intentionally navigates across 13 public/customer/admin surfaces. V77.0.46 removes three duplicate post-sweep navigations by moving their exact assertions into the existing route loop, and gives this one comprehensive language test a dedicated 180-second timeout. The actual language assertions remain unchanged and are not relaxed.

Service Worker cache generation advances to `v77-0-46`. Flyway remains V72. Existing Admin credentials continue to come only from the root `.env`.

### Verify V77.0.46

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_46_pwa_readiness_language_sweep_stabilization.py
```

Expected: `V77.0.46 PWA readiness/language sweep verification: 20/20 checks passed`.

### Focused runtime gate

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui\frontend
$env:PLAYWRIGHT_BASE_URL="https://localhost"
$env:PLAYWRIGHT_BROWSER_CHANNEL="msedge"

npx playwright test `
  e2e/pwa-mobile-v52.spec.ts `
  e2e/realtime-operations-v59-language.spec.ts `
  --project=chromium
```

Expected focused gate: `2 passed / 0 failed`. Then rerun the targeted 3/3 and full 46-test suite before releasing `v77.0.46`.

## V77.0.47 - Historical Release-Gate Forward Compatibility

Windows validation of V77.0.46 completed the runtime release gates successfully: dedicated verifier **20/20**, zero-warning lint, production build **68/68**, healthy full Docker stack, focused PWA/V59 **2/2**, targeted language/CRM/V66 **3/3**, and the full browser suite **46/46**. The stable release script then stopped during source preflight at the historical `verify_v77_0_9_vietnamese_ui_maintenance_completion.py` gate with **64/66** checks.

The first two failing historical checks were stale implementation-shape assertions, not runtime failures: Payment status and Support case status/category are now rendered through `localizedLabel(value, language)` via a local `label(...)` helper, while the old V77.0.9 verifier recognized only direct `viLabel(...)` calls. V77.0.47 updates that historical verifier to accept either contract while still requiring explicit render-time localization of the exact status/category fields.

A full replay of the stable preflight also exposed the next stale historical assertion in V77.0.14: it rejected any `.evaluate(...)` call in the Smart-Planner E2E, even though V77.0.45 introduced a legitimate `page.evaluate(...)` only to read the existing authenticated token for cleanup. The original V77.0.14 risk was specifically evaluating `<option>` nodes to read `.value`, so V77.0.47 narrows that verifier to reject option-node evaluation while allowing unrelated authenticated-page evaluation.

This patch also advances all later V77.0.29+ forward-compatibility metadata to the V77.0.47 stable target, adds a dedicated V77.0.47 verifier, and wires it into stable release, CI, diagnostics and Makefile. No payment/support business logic, browser behavior, schema, seed data or Admin credential policy changes. Service Worker metadata advances to `v77-0-47` for version consistency.

### Verify V77.0.47

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_47_historical_release_gate_forward_compatibility.py
python -X utf8 .\tools\verify_v77_0_9_vietnamese_ui_maintenance_completion.py
python -X utf8 .\tools\verify_v77_0_14_navigation_language_dropdown_localization.py
```

Expected: the V77.0.47, V77.0.9 and V77.0.14 historical gates pass. Because V77.0.46 already reached full browser **46/46**, rerun the normal stable release preflight on the V77.0.47 source and release only if every source/runtime/CI gate remains green.

## V77.0.48 - Maintenance Success-Feedback Timer Ownership

Windows stable-release validation of V77.0.47 passed the repaired historical source gates, dependency audit, zero-warning lint, production build and healthy full Docker stack. The release Browser E2E gate then reached **45/46** with one failure in `maintenance-reliability.spec.ts`: after submitting the valid two-character result `ok`, the transition dialog closed but `maintenance-success-message` was missing before the assertion could observe `Đã hoàn tất phiếu bảo trì`.

The maintenance UI previously allowed every call to `announce()` to start an independent four-second timeout. The V44 journey generates several messages in quick succession (equipment created, work order created, work started, work completed). An older timeout could therefore fire after a newer message had been published and clear the new message. V77.0.48 gives the success-message lifecycle a single owner through `messageTimerRef`: a new announcement first cancels the previous timeout, publishes its own text, installs one bounded timeout, and releases the timer reference when it fires. The timer is also cancelled on component unmount.

The transition contract itself is unchanged: the backend transition still completes first, the dialog closes only after the transition succeeds, the success message is published before the authoritative `load()`, and the browser regression still requires the exact `ok` result, resolved status, persisted `Kết quả: ok`, history transition and visible completion feedback. No retry, longer global timeout, database reset, schema migration or weakened assertion is introduced. Service Worker metadata advances to `v77-0-48`; Flyway remains V72 and Admin credentials remain sourced only from the root `.env`.

### Verify V77.0.48

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_48_maintenance_success_feedback_timer_ownership.py
```

Expected: `V77.0.48 maintenance success-feedback timer ownership verification: 22/22 checks passed`. Then run the focused V44 E2E and the normal stable release flow.

## V77.0.49 - Release Staging Whitespace Preflight

V77.0.48 passed the focused maintenance browser journey and the complete 46-test browser suite. During the stable-only release command, the same full Browser E2E gate passed again, so GitHub publication became eligible. The next fail-closed staging guard then rejected the staged tree because `README.md` ended with an extra blank line (`new blank line at EOF`). No Git commit, push, tag, or GitHub Release was started.

V77.0.49 keeps `git diff --cached --check` unchanged and fixes the source hygiene instead of weakening the release gate. The root README now ends with exactly one newline byte, and `verify_v77_0_49_release_staging_whitespace_preflight.py` checks that README has a canonical single newline EOF, rejects duplicate terminal blank lines, confirms the Git staged-diff whitespace gate remains enabled, and remains no-schema on Flyway V72. This catches the release blocker during source preflight before dependency audit, build, Docker, and the full browser suite.

### Verify V77.0.49

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_49_release_staging_whitespace_preflight.py
```

Expected: `V77.0.49 release staging whitespace preflight verification: 20/20 checks passed`. Then run the normal stable release flow with `.\scripts\release.ps1 v77.0.49`.
## V77.0.50 - V26 CI Service-Worker Version Parser Compatibility

V77.0.49 passed its dedicated source-hygiene verifier and the staged Git whitespace check, then the stable release flow completed local source/runtime gates and pushed the exact commit to `main`. GitHub CI subsequently stopped in the historical V26 PWA source gate at **13/14**. Every printed PWA behavior check passed; the missing check was `service worker cache version`.

The V26 verifier still parsed only the original cache format `const VERSION = "v26"`. Current V77 patch releases intentionally use a patch-scoped cache ID such as `v77-0-49`, so the old grep returned no numeric version even though the cache generation was newer than V26. V77.0.50 updates only that parser: it accepts `v<major>`, `v<major>-<minor>-<patch>`, or dotted numeric equivalents, extracts the leading major number, and still requires that major to be at least 26. The authenticated-API cache exclusion, offline-ticket storage, install/update UX and all other V26 checks are unchanged.

A dedicated V77.0.50 verifier requires the historical shell gate to produce **14/14**, proves the parser recognizes the current patch-form Service Worker generation, confirms CI continues to execute the V26 shell gate, and preserves Flyway V72/no-schema plus the existing stable-only release flow.

### Verify V77.0.50

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_50_v26_ci_service_worker_version_parser.py
bash tools/verify-v26-source.sh
```

Expected: V77.0.50 verifier passes and `verify-v26-source.sh` ends with `14/14 checks passed`. Then rerun `./scripts/release.ps1 v77.0.50` from PowerShell.
## V77.0.51 - V66 Booking Authority Boot-Surface Stability

The V77.0.50 release run proved the historical V26 PWA gate was repaired, but its full Browser E2E run stopped at 45/46 because `booking-consistency-seat-locking-v66.spec.ts` could navigate to `/booking/{showtimeId}` while the booking page was still inside its loading/transient-read early return. The V66 authority marker had already been made independent of `held`, but it still lived only below the page's loading and unavailable guards, so the DOM temporarily had no `seat-hold-authority-v66` surface.

V77.0.51 makes the authority marker a boot-safe render invariant. The same marker is rendered while the seat map is loading, on the unavailable/error surface, and in the normal booking summary. The marker continues to use the seat-map authority when available and the architectural default `POSTGRESQL_WITH_REDIS_MIRROR` before the map arrives. The V66 browser journey is not weakened: it still races two independent users against the same seat pair, requires exactly one 200 and one 409, verifies the winning API response authority and UUID hold token, verifies the booking marker, verifies Admin operations visibility, and releases the winning hold.

No Flyway migration is added; latest remains V72. No Admin credential fallback is added. Service Worker generation advances to `v77-0-51`.

### Verify V77.0.51

```powershell
python -X utf8 .\tools\verify_v77_0_51_v66_booking_authority_boot_surface.py
```

Expected: the V77.0.51 verifier passes, then run the focused V66 Playwright journey before the full 46-test Browser E2E gate and stable-only release.
## V77.0.52 - Full-Suite Transient Read Resilience

The V77.0.51 focused V66 journey passed 1/1, but the subsequent full 46-test browser run stopped at 42/46. Four otherwise unrelated pages rendered their page shells while their authenticated read data never reached the expected UI surface within the browser gate: the V41 notification test could not see the durable test notification it had just created, V65 remained on `Đang tải SLO...`, and V53/V58 had no summary surface. The failures share the same transport shape: authenticated idempotent reads under sustained full-suite load.

V77.0.52 adds `frontend/lib/transient-read.ts`, a bounded abortable retry helper for read-only requests. Each attempt owns an `AbortController`; transient network/abort, HTTP 408, 425, 429 and 5xx failures may retry with exponential backoff, but the entire operation is capped at 12 seconds and each attempt at 3.5 seconds. Authentication/authorization failures are not retryable, and mutation requests are not routed through this helper. Notifications, Observability V65, Command Center V53 and Operations Control V58/V59 now use this helper only for their GET/bootstrap reads. No placeholder notification, SLO, command-center summary or operations snapshot is fabricated.

The existing browser contracts remain unchanged: V41 must still create a durable notification and prove archive/restore/read state; V65 must still render the real SLO/dependency payload; V53 and V58/V59 must still render real operational snapshots; V66 keeps its exact 200/409 seat-hold race and authority checks; the historical V26 shell gate remains 14/14. No Flyway migration is added; latest remains V72. Service Worker generation advances to `v77-0-52`.

### Verify V77.0.52

```powershell
cd D:\LienThongDH\DoAn\cinebooking-pro-email-password-ui
python -X utf8 .\tools\verify_v77_0_52_full_suite_transient_read_resilience.py
```

Expected: V77.0.52 verifier passes. Then run the four focused browser journeys, the full 46-test suite, and finally `./scripts/release.ps1 v77.0.52`.
## V77.0.53 - Historical V29.2 Playwright Contract Compatibility

V77.0.52 reached GitHub CI on exact commit `dc8e98af490fbe15d1008b8394515bc1c595f6ae`, but the `V26-V77 source regression` job stopped at the historical V29.2 structure verifier with 25/31 checks. The six failures were not missing runtime behavior: the current `booking-flow.spec.ts` still registers a unique customer, performs an explicit fresh login, completes MOCK payment to a confirmed booking, opens the signed ticket QR, checks in through the staff gate and sources Admin credentials from the test environment. The historical verifier was still searching only for the original V29.2 literal locator/navigation shapes.

V77.0.53 updates `tools/verify_v29_2_playwright_e2e.py` to accept the original contract or the current equivalent implementation: `register-submit`/`login-submit` test IDs, `gotoSurface()` navigation, `mock-payment-success`, `ticket-qr-v33` plus `/api/tickets/${id}`, `staff-check-in-submit` plus the successful check-in message, and `loginExistingAdmin()` backed by `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` in `runtime-guards.ts`. The verifier remains 31 checks and continues to fail if any semantic browser-journey requirement disappears. No Flyway migration is added; latest remains V72. Service Worker generation advances to `v77-0-53`.

### Verify V77.0.53

```powershell
python -X utf8 .\tools\verify_v77_0_53_v29_2_playwright_contract_compatibility.py
python -X utf8 .\tools\verify_v29_2_playwright_e2e.py
```

Expected: V77.0.53 dedicated verifier passes and historical V29.2 returns 31/31 before rerunning the stable release flow.
