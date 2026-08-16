# Đề cương báo cáo đồ án

## Tên đề tài đề xuất

**Thiết kế và xây dựng hệ thống đặt vé xem phim đa nền tảng chịu tải cao sử dụng Spring Boot, Redis và kiến trúc thời gian thực**

## 1. Lý do chọn đề tài

Hệ thống đặt vé có đặc trưng nhiều người dùng truy cập cùng lúc vào các khung giờ cao điểm, trong đó bài toán quan trọng nhất là đảm bảo một ghế không bị bán cho nhiều người khi có nhiều request tranh chấp đồng thời. Đề tài kết hợp phát triển Web/PWA, mobile, cơ sở dữ liệu, lập trình mạng, bảo mật, phân tích thiết kế hệ thống và kiểm thử tải.

## 2. Mục tiêu

- Xây dựng ứng dụng Web/PWA responsive chạy desktop và mobile.
- Xây dựng ứng dụng bonus Android/iOS bằng Expo/React Native dùng chung REST API.
- Quản lý phim, rạp, phòng, ghế, suất chiếu, booking, payment, ticket.
- Giữ ghế tạm thời bằng Redis với TTL.
- Không bán trùng ghế khi có nhiều request đồng thời.
- Cập nhật trạng thái ghế realtime qua WebSocket.
- Tích hợp Mock payment, VNPay Sandbox và MoMo Sandbox.
- Sinh QR ticket sau khi payment thành công.
- Scale ngang 2 backend instances qua Nginx.
- Đo tải bằng k6 với kịch bản 1.000 virtual users.

## 3. Phạm vi

### Trong phạm vi

- Authentication JWT, User/Admin.
- Danh sách phim và suất chiếu.
- Seat map và seat hold.
- Booking + payment + QR ticket.
- Realtime state sync.
- Admin cơ bản.
- Load balancing và monitoring.

### Ngoài phạm vi bản đồ án

- Kết nối hệ thống rạp thật.
- Kế toán/đối soát merchant production.
- Hoàn tiền production.
- Loyalty/CRM phức tạp.
- Kubernetes multi-region.

## 4. Yêu cầu chức năng

| Mã | Chức năng | Actor |
|---|---|---|
| F01 | Đăng ký/đăng nhập | User |
| F02 | Xem phim/suất chiếu | Guest/User |
| F03 | Xem sơ đồ ghế realtime | Guest/User |
| F04 | Giữ nhiều ghế trong 5 phút | User |
| F05 | Tạo booking | User |
| F06 | Thanh toán | User |
| F07 | Xem QR ticket | User |
| F08 | Xem lịch sử booking | User |
| F09 | Quản lý phim | Admin |
| F10 | Quản lý suất chiếu | Admin |
| F11 | Xem booking | Admin |

## 5. Yêu cầu phi chức năng

- **Consistency:** không có hai `booking_seat` cho cùng `(showtime_id, seat_id)`.
- **Concurrency:** request giữ ghế phải atomic ở Redis.
- **Scalability:** backend stateless và chạy được nhiều instance.
- **Performance:** mục tiêu demo p95 < 800 ms ở kịch bản browse 1.000 VU trên máy đủ tài nguyên.
- **Security:** password BCrypt, JWT HMAC-SHA256, validation input, role-based authorization.
- **Availability:** Redis/PostgreSQL health check trong Docker Compose.
- **Observability:** Actuator + Prometheus + Grafana tùy chọn.

## 6. Mapping với học phần CNTT

- Lập trình hướng đối tượng: domain/entity/service/controller.
- Cơ sở dữ liệu và CSDL nâng cao: PostgreSQL, transaction, index, unique constraint.
- Cấu trúc dữ liệu & giải thuật: xử lý tập ghế, map/set, contention logic.
- Công nghệ phần mềm: modular architecture, requirements, testing, deployment.
- Lập trình mạng máy tính: REST, HTTP, WebSocket, reverse proxy/load balancing.
- Lập trình Web: Next.js PWA + Spring Web.
- Phân tích thiết kế hệ thống: ERD, sequence diagram, component diagram.
- Bảo mật thông tin: JWT, BCrypt, role authorization, HMAC payment signatures.
- Phát triển ứng dụng J2EE/Java Enterprise: Spring Boot/JPA/Security.

## 7. Bố cục báo cáo

### Chương 1 — Tổng quan

Bối cảnh, bài toán, mục tiêu, phạm vi, phương pháp thực hiện.

### Chương 2 — Cơ sở lý thuyết và công nghệ

REST, WebSocket, transaction, Redis, distributed coordination, JWT, PWA, load balancing, payment gateway.

### Chương 3 — Phân tích và thiết kế

Use case, ERD, schema, state machine, sequence booking/payment, component/deployment diagram.

### Chương 4 — Xây dựng hệ thống

Frontend, backend modules, Redis Lua script, PostgreSQL constraint, WebSocket + Redis Pub/Sub, payment adapters, QR.

### Chương 5 — Kiểm thử và đánh giá

Functional test, concurrency test, load test, kết quả p95/p99, error rate, chứng minh invariant không bán trùng.

### Chương 6 — Kết luận và hướng phát triển

Đánh giá đạt mục tiêu, hạn chế, Kafka/outbox, Kubernetes, HA database, signed QR, recommendation engine.
