# Cinema Portal Upgrade

Bản nâng cấp giao diện và luồng khách hàng theo mô hình cổng đặt vé rạp chiếu phim hiện đại.

## Đã thay đổi

- Bỏ hero "Đặt vé nhanh. Giữ ghế realtime. Không bán trùng."
- Bỏ dòng "Dữ liệu demo được seed tự động."
- Thêm thanh đặt vé 4 bước: Phim -> Rạp -> Ngày -> Suất -> Chọn ghế.
- Thêm trang `/movies` với tab Đang chiếu / Sắp chiếu / Tất cả và tìm kiếm.
- Thêm trang `/cinemas` để xem rạp, chọn ngày và lịch chiếu theo rạp.
- Thêm trang `/promotions` cho tiện ích/ưu đãi.
- Nâng cấp thẻ phim, trang chi tiết phim và lịch chiếu.
- Nâng cấp header responsive và footer.
- Backend có public endpoint `GET /api/cinemas`.
- Showtime response có thêm `cinemaId` để frontend lọc rạp ổn định.
- Nginx dùng Docker DNS resolver cho upstream để giảm lỗi 502 sau khi recreate backend/frontend.

## Không thay đổi database

Bản nâng cấp này không thêm Flyway migration. Database hiện tại tiếp tục dùng được.

## Chạy sau khi cập nhật

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2 frontend nginx
```

Sau đó mở `http://localhost` và nhấn `Ctrl + F5` nếu trình duyệt còn cache giao diện cũ.
