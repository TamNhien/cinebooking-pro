# Upload poster phim từ máy

Bản này cho phép Admin upload poster trực tiếp từ máy thay vì bắt buộc nhập Poster URL.

## Cách dùng

1. Đăng nhập bằng tài khoản ADMIN.
2. Vào `/admin` -> tab `Phim`.
3. Ở mục `Poster phim`, bấm chọn file.
4. Chọn JPG/JPEG, PNG hoặc WebP, tối đa 5 MB.
5. Ảnh được upload ngay và hiển thị preview.
6. Bấm `Lưu` để lưu URL poster vào bản ghi phim.

Admin vẫn có thể nhập URL ảnh bên ngoài nếu muốn.

## Cách lưu file

Backend lưu file vào:

```text
uploads/movies/<uuid>.jpg|png|webp
```

Database chỉ lưu URL, ví dụ:

```text
/uploads/movies/4c7a...-poster.jpg
```

Hai backend Docker dùng chung bind mount `./uploads:/app/uploads`, vì vậy ảnh vẫn truy cập được khi Nginx phân tải sang backend-1 hoặc backend-2.

## Bảo vệ upload

- Chỉ ADMIN mới gọi được `POST /api/admin/uploads/posters`.
- Kiểm tra kích thước tối đa 5 MB ở cả frontend và backend.
- Backend kiểm tra magic bytes thực của JPG, PNG và WebP, không chỉ tin vào phần mở rộng file.
- File được đổi tên bằng UUID để tránh trùng tên/path traversal.
- `/uploads/**` chỉ public ở phương thức GET để trang chủ có thể hiển thị poster.

## Sau khi cập nhật source

```powershell
docker compose down
docker compose up -d --build
```

Sau đó mở `http://localhost/admin` và thử upload poster.
