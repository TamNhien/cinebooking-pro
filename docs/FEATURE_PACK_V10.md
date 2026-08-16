# CineBooking Pro V10 - Staff Shifts, Attendance & Gate Control

## Tính năng mới

- Admin tạo/sửa tài khoản STAFF/MANAGER ở `/admin/staff` (giữ từ V9).
- Admin xếp ca cho STAFF/MANAGER; MANAGER chỉ xếp ca cho STAFF cùng rạp tại `/admin/shifts`.
- Chặn ca trùng giờ, hỗ trợ ca qua đêm (ví dụ 20:00-02:00).
- STAFF/MANAGER xem lịch cá nhân tại `/staff/schedule`.
- Chấm công bắt đầu/kết thúc ca, lưu IP, thời gian và audit log.
- Mặc định chỉ được bắt đầu ca từ 30 phút trước đến 60 phút sau giờ bắt đầu.
- Quét QR vé chỉ khi:
  1. tài khoản STAFF/MANAGER đang hoạt động;
  2. hồ sơ nhân viên ở trạng thái ACTIVE;
  3. đã bắt đầu ca;
  4. ca hiện tại thuộc đúng rạp;
  5. vé thuộc đúng rạp được phân công;
  6. ca chưa quá giờ + grace period.
- ADMIN có quyền override check-in khẩn cấp mà không cần ca.
- Audit: `SHIFT_CREATE`, `SHIFT_UPDATE`, `SHIFT_CANCEL`, `SHIFT_CHECK_IN`, `SHIFT_CHECK_OUT`, `TICKET_CHECK_IN`.

## Migration

`V10__staff_shifts_attendance.sql` tạo:

- `staff_shift`
- `staff_attendance`

Không xóa database cũ. Flyway sẽ nâng từ V9 lên V10.

## Cấu hình

```env
STAFF_TIME_ZONE=Asia/Ho_Chi_Minh
ATTENDANCE_START_EARLY_MINUTES=30
ATTENDANCE_START_LATE_MINUTES=60
STAFF_SCAN_GRACE_MINUTES=30
```

## Test thủ công đề xuất

1. Admin tạo STAFF và phân vào Rạp A.
2. Admin vào `/admin/shifts`, xếp ca cho STAFF trong thời điểm hiện tại.
3. STAFF đăng nhập `/staff/schedule` và bấm Bắt đầu ca.
4. STAFF vào `/staff/check-in`, camera được bật khi gate status = sẵn sàng.
5. Quét QR vé Rạp A -> thành công.
6. Quét lại cùng vé -> bị từ chối đã check-in.
7. Quét vé Rạp B -> bị từ chối sai rạp.
8. Kết thúc ca -> gate status khóa, không quét tiếp được.
9. MANAGER chỉ nhìn/xếp STAFF thuộc rạp mình.
10. Tạo ca chồng giờ -> API trả 409.

## Điện thoại thật

Web camera yêu cầu secure context. Khi thử trên điện thoại, nên chạy CineBooking qua HTTPS (domain/tunnel HTTPS). `http://localhost` chỉ là localhost của chính thiết bị, còn `http://IP-LAN` có thể bị trình duyệt chặn camera.
