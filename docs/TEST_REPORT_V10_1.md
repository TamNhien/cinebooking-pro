# CineBooking V10.1 - Smoke-test fix

## Lý do V10 cũ có thể dừng ở `401 Unauthorized`

`tools/test-v10.ps1` V10 cũ dùng cứng `admin@cine.local / Admin@123`.

Trong ứng dụng, `ADMIN_PASSWORD` chỉ dùng bởi `AdminBootstrap` **khi tài khoản admin chưa tồn tại**. Nếu admin đã đổi hoặc reset mật khẩu, restart Docker không ghi đè mật khẩu hiện tại trong PostgreSQL. Vì vậy một database đã sử dụng lâu có thể trả 401 dù `.env` vẫn ghi `ADMIN_PASSWORD=Admin@123`.

## V10.1 sửa gì

- Không mặc định gửi mật khẩu hard-code vào API.
- Đọc `ADMIN_EMAIL` từ `.env`.
- Hỏi mật khẩu admin hiện tại bằng `Read-Host -AsSecureString`.
- Có thể truyền `-AdminPassword` nếu chạy CI/local tự động.
- Có tùy chọn `-UseEnvAdminPassword` nếu chắc chắn mật khẩu DB vẫn bằng `.env`.
- Kiểm tra public API trước khi login để phân biệt lỗi backend/nginx với lỗi credential.
- Kiểm tra chính xác HTTP 409 cho ca làm trùng.
- Sau test, tự vô hiệu hóa tài khoản STAFF tổng hợp thay vì để một tài khoản test còn đăng nhập được.
- Thêm `tools/diagnose-v10.ps1` để kiểm tra Docker, Flyway, admin account và public API mà không đọc password hash.

## Chạy

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v10.ps1
powershell -ExecutionPolicy Bypass -File .\tools\test-v10.ps1
```

Hoặc:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-v10.ps1 -AdminEmail "admin@cine.local" -AdminPassword "MAT_KHAU_HIEN_TAI"
```

Không đưa mật khẩu thật vào Git hoặc chụp màn hình command history khi dùng tham số `-AdminPassword`; cách nhập tương tác an toàn hơn.
