# Kế hoạch kiểm thử

## 1. Functional acceptance

| Case | Kỳ vọng |
|---|---|
| Đăng ký email mới | HTTP 201 + JWT |
| Đăng ký email trùng | HTTP 409 |
| Login sai mật khẩu | HTTP 401 |
| Guest xem movie/showtime/seat map | HTTP 200 |
| User giữ ghế trống | HTTP 200 |
| User B giữ ghế đang do A giữ | HTTP 409 |
| Tạo booking không có hold | HTTP 409 |
| Tạo booking với hold hợp lệ | HTTP 201, PENDING |
| Mock payment success | Payment SUCCESS, Booking CONFIRMED |
| Mock payment fail | Payment FAILED, Booking CANCELLED, ghế mở lại |
| Booking hết hạn | EXPIRED, booking_seat bị xóa |
| User khác mở QR | HTTP 403 |
| Booking chưa CONFIRMED mở QR | HTTP 409 |

## 2. Invariant quan trọng nhất

SQL kiểm tra bán trùng:

```sql
SELECT showtime_id, seat_id, COUNT(*)
FROM booking_seat
GROUP BY showtime_id, seat_id
HAVING COUNT(*) > 1;
```

Kết quả bắt buộc: **0 dòng**.

Ngoài logic ứng dụng, schema có unique constraint `uq_showtime_seat_reserved`, vì vậy DB từ chối trạng thái vi phạm invariant.

## 3. Contention test

Chạy 100 VU cùng tranh một `SEAT_ID`:

```bash
k6 run \
  -e BASE_URL=http://localhost/api \
  -e SHOWTIME_ID=55555555-5555-5555-5555-555555555555 \
  -e SEAT_ID=<seat-uuid> \
  -e VUS=100 \
  loadtest/contention.js
```

Acceptance:

- `hold_success count == 1`
- `booking_success count == 1`
- SQL invariant trả 0 dòng.

## 4. High traffic test

`loadtest/high-traffic.js` ramp đến 1.000 VU.

Theo dõi:

- requests/s
- p50/p95/p99 latency
- error rate
- CPU/memory của backend-1 và backend-2
- JVM heap/GC
- PostgreSQL connections
- Redis latency

Mục tiêu p95/p99 trong script chỉ là tiêu chí demo và phải được báo cáo cùng cấu hình phần cứng, không nên trình bày như benchmark tuyệt đối.

## 5. Failure scenarios nên demo thêm

- Tắt một backend instance khi đang browse: Nginx tiếp tục route sang instance còn lại.
- WebSocket client ở backend-1 nhưng booking request tới backend-2: Redis Pub/Sub vẫn fan-out seat event.
- Redis hold hết TTL trước checkout: booking bị từ chối.
- Payment callback gửi lại nhiều lần: trạng thái success được xử lý idempotent ở mức payment state.
