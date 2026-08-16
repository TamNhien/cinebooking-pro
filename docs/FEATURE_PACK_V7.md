# CineBooking Pro – Feature Pack V7

## Tính năng mới

### 1. Cine Food / bắp nước / combo
- Danh mục sản phẩm bán kèm do Admin quản lý.
- Khách chọn số lượng ngay ở trang chọn ghế.
- Giá sản phẩm được snapshot vào `booking_concession` để lịch sử đơn không thay đổi khi Admin sửa giá về sau.
- Dữ liệu mẫu: Bắp Caramel, Nước ngọt, Combo Couple.

### 2. Voucher
- Hỗ trợ giảm theo phần trăm (`PERCENT`) hoặc số tiền cố định (`FIXED`).
- Điều kiện: đơn tối thiểu, mức giảm tối đa, thời gian bắt đầu/kết thúc, giới hạn lượt dùng, bật/tắt.
- Dùng row lock khi ghi nhận voucher để tránh vượt usage limit khi nhiều request đồng thời.
- Nếu booking hết hạn/hủy trước thanh toán, lượt voucher được trả lại.
- Voucher demo: `WELCOME10`, `CINE20K`.

### 3. Dùng điểm thành viên
- 1 điểm = 100đ khi đổi.
- Tối đa 30% giá trị đơn sau voucher.
- Backend khóa row user khi trừ/hoàn điểm để tránh race condition.
- Booking bị hủy/hết hạn sẽ tự hoàn điểm.
- Bảng `loyalty_transaction` lưu audit EARN / REDEEM / REFUND.

### 4. Notification Center
- Bell trên header có badge số thông báo chưa đọc.
- Trang `/notifications`.
- Thông báo payment thành công, booking hủy/hết hạn và nhắc giờ chiếu.
- Job nhắc giờ chiếu chạy trên cả 2 backend nhưng dùng pessimistic lock + `reminder_sent` để tránh gửi trùng.

### 5. Admin Commerce
- `/admin/commerce`
- CRUD/tạm dừng bắp nước và voucher.

### 6. Admin Analytics
- `/admin/analytics`
- KPI doanh thu, booking xác nhận, số vé, doanh thu Cine Food, số user.
- Biểu đồ doanh thu theo ngày.
- Top phim, phương thức thanh toán, sản phẩm bắp nước.
- Chọn khoảng 7 / 30 / 90 / 365 ngày.

## Migration

Flyway thêm:

`V7__commerce_vouchers_notifications_analytics.sql`

Các bảng mới:
- `concession_product`
- `booking_concession`
- `voucher`
- `voucher_redemption`
- `loyalty_transaction`
- `user_notification`

Các cột mới của `booking`:
- `seat_amount`
- `concession_amount`
- `discount_amount`
- `points_redeemed`
- `voucher_code`
- `benefits_refunded`
- `reminder_sent`

## Chạy nâng cấp

Không xóa volume database.

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2 frontend nginx
```

Kiểm tra Flyway:

```powershell
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history ORDER BY installed_rank;"
```

Kết quả cần có:

`7 | commerce vouchers notifications analytics | t`

## Kiểm tra nhanh

- `/promotions`: thấy voucher + Cine Food.
- `/booking/<showtimeId>`: chọn ghế, bắp nước, voucher, điểm.
- `/profile`: lịch sử điểm.
- `/notifications`: notification center.
- `/admin/commerce`: quản lý combo/voucher.
- `/admin/analytics`: dashboard doanh thu.
