# Fix lỗi Admin 403

Bản này xử lý trường hợp trình duyệt còn lưu JWT của một CineBooking cũ trên cùng origin `http://localhost`.

## Nguyên nhân

`localStorage` thuộc theo origin, không theo thư mục project. Vì vậy khi chạy nhiều bản CineBooking khác nhau ở `http://localhost`, token cũ vẫn được giao diện đọc và hiển thị tên/role ADMIN, nhưng backend mới có thể từ chối token đó. Kết quả là Dashboard hiển thị `403`, số liệu bằng 0 và upload poster cũng báo `403`.

## Thay đổi

- localStorage key được nâng version thành `cinebooking_auth_v2` và tự xóa key cũ `cinebooking_auth`.
- Admin Dashboard xác minh lại phiên thật bằng `GET /api/me` trước khi tải dữ liệu.
- JWT sai/hết hạn trả HTTP 401 rõ ràng thay vì biến thành 403.
- Frontend tự xóa phiên không hợp lệ và yêu cầu đăng nhập lại.
- 403 thật chỉ còn dùng cho trường hợp tài khoản hợp lệ nhưng không có quyền ADMIN.

## Sau khi cập nhật

```powershell
docker compose up -d --build --force-recreate backend-1 backend-2 frontend nginx
```

Sau đó mở `http://localhost`, đăng nhập lại bằng tài khoản ADMIN. Lần đầu sau bản fix sẽ bị đăng xuất chủ động vì token cũ được xóa.
