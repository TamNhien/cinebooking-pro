# CineBooking Feature Pack V6

Bản nâng cấp này bổ sung ba nhóm chức năng hướng tới một cổng đặt vé rạp phim hoàn chỉnh hơn.

## 1. Phim yêu thích

- Người dùng đăng nhập có thể thêm/bỏ phim khỏi danh sách yêu thích ngay ở trang chi tiết phim.
- Trang mới: `/favorites`.
- API:
  - `GET /api/me/favorites`
  - `GET /api/me/favorites/{movieId}`
  - `PUT /api/me/favorites/{movieId}` body `{ "favorite": true|false }`

Dữ liệu được lưu ở bảng `movie_favorite`, unique theo `(user_id, movie_id)`.

## 2. Đánh giá và xếp hạng phim

- Rating từ 1 đến 5 sao.
- Mỗi tài khoản có tối đa một đánh giá trên mỗi phim; gửi lại sẽ cập nhật đánh giá cũ.
- Trang chi tiết phim hiển thị điểm trung bình và số lượt đánh giá.
- Admin có trang kiểm duyệt `/admin/reviews` và có thể xóa đánh giá.
- API public:
  - `GET /api/movies/{movieId}/reviews`
  - `GET /api/movies/{movieId}/rating-summary`
- API đăng nhập:
  - `PUT /api/movies/{movieId}/reviews/me`
  - `DELETE /api/movies/{movieId}/reviews/me`
- API admin:
  - `GET /api/admin/reviews`
  - `DELETE /api/admin/reviews/{id}`

Dữ liệu lưu ở bảng `movie_review`, unique theo `(user_id, movie_id)`.

## 3. Thành viên và tích điểm

Sau mỗi payment thành công, người dùng được cộng điểm tự động:

- `10.000 VND = 1 điểm`.
- Tối thiểu 1 điểm cho một giao dịch thành công.
- BRONZE: 0 - 499.
- SILVER: 500 - 1.499.
- GOLD: 1.500 - 3.999.
- DIAMOND: từ 4.000.

`payment.loyalty_points_awarded` đảm bảo một payment chỉ được cộng điểm một lần. `PaymentService` khóa bản ghi payment bằng pessimistic lock khi xác nhận để giảm nguy cơ callback thanh toán lặp gây cộng điểm trùng.

Trang `/profile` hiển thị điểm, hạng thành viên và tiến độ hạng.

## Migration

Flyway mới:

`V6__engagement_and_loyalty.sql`

Migration tạo `movie_favorite`, `movie_review` và thêm các cột loyalty. Không cần xóa database cũ.

## Cập nhật project

Giữ nguyên `.env`, `uploads/` và volume PostgreSQL. Không chạy `docker compose down -v`.

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2 frontend nginx
```

Kiểm tra Flyway:

```powershell
docker compose exec postgres psql -U cinebooking -d cinebooking -c "SELECT version,description,success FROM flyway_schema_history ORDER BY installed_rank;"
```

Cần thấy version 6 thành công.
