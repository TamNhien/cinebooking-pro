# CineBooking Pro — Feature Pack V8

V8 tập trung vào vận hành rạp, kiểm soát vé, hoàn tiền, phân quyền và bảo mật.

## 1. QR check-in tại rạp

- QR vé không còn là chuỗi booking dễ đoán; payload được ký HMAC-SHA256 bằng secret của hệ thống.
- API nhân viên: `POST /api/staff/check-in`.
- Chỉ `STAFF`, `MANAGER`, `ADMIN` được check-in.
- Vé chỉ check-in một lần; database ghi `checked_in_at`, `checked_in_by`.
- Trang `/staff/check-in` hỗ trợ camera bằng BarcodeDetector, upload ảnh QR và nhập payload thủ công.
- Khung check-in mặc định: sớm tối đa 48 giờ, trễ tối đa 4 giờ để thuận tiện demo. Có thể đổi qua `.env`.

## 2. Quy trình hoàn vé

- Khách gửi yêu cầu tại `/bookings`.
- Chỉ booking `CONFIRMED`, chưa check-in, còn ít nhất 2 giờ trước suất chiếu mới được yêu cầu.
- Chính sách demo:
  - >= 24 giờ: hoàn 100%.
  - 2–24 giờ: hoàn 70%.
- Trạng thái: `CONFIRMED -> REFUND_REQUESTED -> REFUNDED`.
- Admin có `/admin/refunds` để duyệt hoặc từ chối.
- Khi duyệt: ghế được mở bán lại, voucher được trả lượt, điểm đã dùng được hoàn, điểm đã tích từ giao dịch được thu hồi, payment chuyển `REFUNDED`.
- Đây là quy trình refund nội bộ phục vụ đồ án. Adapter refund server-to-server thực tế của VNPay/MoMo cần merchant credential và API refund riêng của từng cổng.

## 3. Seat Layout Editor

Trang `/admin/seat-layout/[auditoriumId]` cho phép thiết kế phòng chiếu trực quan:

- STANDARD
- VIP
- COUPLE
- ACCESSIBLE
- BLOCKED (lối đi / vị trí không bán)

Có thể chỉnh số hàng và số ghế mỗi hàng. Backend từ chối thay toàn bộ layout nếu ghế hiện tại đã xuất hiện trong booking để tránh phá lịch sử dữ liệu.

## 4. RBAC

Vai trò:

- `USER`: khách hàng.
- `STAFF`: check-in vé.
- `MANAGER`: check-in + Analytics.
- `ADMIN`: toàn quyền CRUD, refund, audit, analytics.

Admin có thể đổi role trong trang quản lý người dùng. Người dùng nên đăng nhập lại sau khi role thay đổi để giao diện local cập nhật role mới.

## 5. Audit Log

Bảng `audit_log` lưu:

- đăng ký;
- login success / login failed;
- check-in;
- refund request / approve / reject;
- các request ghi dữ liệu dưới `/api/admin/**`.

Trang xem log: `/admin/audit`.

## 6. Login rate limiting

Redis theo dõi số lần đăng nhập sai theo email:

- mặc định 5 lần;
- khóa 15 phút;
- đăng nhập thành công sẽ xóa counter.

Cấu hình:

```env
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCK_SECONDS=900
```

## 7. Password hashing hiện đại

- Password mới dùng **Argon2id**.
- Hash BCrypt cũ vẫn đăng nhập được.
- Sau lần login thành công đầu tiên, BCrypt cũ tự được re-hash thành Argon2id.
- `password_hash` được mở rộng lên `VARCHAR(255)`.

Cấu hình Argon2id trong source sử dụng memory cost khoảng 19 MiB, 2 iterations, parallelism 1 để phù hợp máy đồ án/local.

## 8. Migration

Flyway mới:

```text
V8__operations_checkin_refund_rbac_audit.sql
```

Không xóa database cũ. Chỉ chạy:

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2 frontend nginx
```

Kiểm tra:

```powershell
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history ORDER BY installed_rank;"
```

Kỳ vọng có:

```text
8 | operations checkin refund rbac audit | t
```

## 9. Test nhanh

1. Admin tạo user `STAFF`.
2. Đăng nhập customer, đặt vé và thanh toán MOCK.
3. Mở `/ticket/<bookingId>` trên customer.
4. Đăng nhập staff ở trình duyệt/thiết bị khác, mở `/staff/check-in` và quét QR.
5. Quét lần hai phải bị từ chối.
6. Với một vé khác chưa check-in, vào `/bookings` gửi yêu cầu refund.
7. Admin vào `/admin/refunds`, duyệt refund.
8. Kiểm tra seat map: ghế đã được mở bán lại.
9. Admin mở `/admin/audit` để xem toàn bộ log.
