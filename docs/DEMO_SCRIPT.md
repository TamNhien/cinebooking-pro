# Kịch bản bảo vệ đồ án (7-10 phút)

1. Mở trang PWA trên laptop và điện thoại, chứng minh responsive/đa nền tảng.
2. Đăng nhập hai tài khoản ở hai cửa sổ khác nhau, cùng mở một suất chiếu.
3. User A giữ ghế A1. User B nhận thay đổi realtime và thấy A1 chuyển sang trạng thái HELD.
4. User B cố giữ A1 và nhận HTTP 409.
5. User A tạo booking, chạy Mock payment success, mở QR vé.
6. Mở Admin Dashboard để xem booking đã CONFIRMED.
7. Chạy `k6 run loadtest/contention.js`: 100 user tranh một ghế; threshold yêu cầu đúng 1 booking thành công.
8. Chạy `k6 run loadtest/high-traffic.js`: ramp đến 1.000 virtual users; trình bày p95/p99 và error rate.
9. Mở `docker compose ps` để chứng minh 2 backend instance sau Nginx.
10. Kết luận: Redis giải quyết seat hold tốc độ cao; PostgreSQL UNIQUE constraint là invariant cuối cùng chống bán trùng.
