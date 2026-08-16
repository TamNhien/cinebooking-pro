# Email password reset + strong password UI

## 1. Luồng hoạt động

1. Người dùng mở `/forgot-password` và nhập email đã đăng ký.
2. Backend tạo token ngẫu nhiên 32 byte, chỉ lưu SHA-256 của token vào PostgreSQL.
3. Backend gửi email HTML có nút **Đặt lại mật khẩu**.
4. Link có dạng `http://localhost/reset-password?token=...` và mặc định hết hạn sau 30 phút.
5. Trang reset kiểm tra mật khẩu ở frontend và backend.
6. Sau khi đổi thành công, token được đánh dấu `used_at`, không thể dùng lại.

## 2. Chính sách mật khẩu

Mật khẩu mới phải:
- dài ít nhất 8 ký tự, tối đa 100 ký tự;
- có ít nhất 1 chữ hoa A-Z;
- có ít nhất 1 chữ thường a-z;
- có ít nhất 1 chữ số 0-9;
- có ít nhất 1 ký tự đặc biệt.

UI hiển thị độ mạnh, từng tiêu chí, trạng thái hai mật khẩu có trùng khớp hay không, và nút Hiện/Ẩn cho các ô mật khẩu.

## 3. Gmail SMTP

Trong `.env`:

```env
RESET_TOKEN_MINUTES=30
DEV_RESET_LINK=false
MAIL_ENABLED=true
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=YOUR_16_DIGIT_APP_PASSWORD
MAIL_SMTP_AUTH=true
MAIL_STARTTLS=true
MAIL_STARTTLS_REQUIRED=true
MAIL_FROM=your-email@gmail.com
```

`MAIL_PASSWORD` là Google App Password, không phải mật khẩu Gmail thường.

Sau khi sửa `.env`, rebuild/recreate backend:

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2
```

Xem log:

```powershell
docker compose logs -f backend-1
```

## 4. Test

- Đăng ký một tài khoản bằng email thật.
- Vào `http://localhost/forgot-password`.
- Nhập email đó và bấm gửi.
- Mở email, bấm nút **Đặt lại mật khẩu**.
- Nhập mật khẩu ví dụ `Cinema@2026` hai lần.
- Đăng nhập lại với mật khẩu mới.

Nếu mở email trên điện thoại thì `http://localhost` trỏ về chính điện thoại. Khi đó đổi `FRONTEND_URL` sang IP LAN của máy chạy Docker, ví dụ `http://192.168.1.20`, và bảo đảm điện thoại truy cập được máy đó trong cùng mạng.
