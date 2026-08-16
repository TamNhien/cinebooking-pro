# V10 Test Report

Ngày kiểm tra: 2026-08-12.

## Đã chạy trong môi trường tạo source

### 1. Business-rule executable tests

Chạy trực tiếp bằng `javac/java` trên `StaffShiftRules`:

- phát hiện ca chồng giờ;
- cho phép hai ca nối tiếp đúng giờ;
- phát hiện chồng ca qua nửa đêm;
- cho phép bắt đầu ca trong cửa sổ 30 phút sớm;
- cho phép bắt đầu ca tối đa 60 phút trễ;
- từ chối bắt đầu quá sớm;
- từ chối bắt đầu quá trễ;
- cho phép quét trong grace period 30 phút;
- từ chối quét sau grace period.

Kết quả: **9/9 PASS**.

### 2. Structural / security checks

`tools/verify_v10.py` kiểm tra migration, endpoint security, gate policy, attendance policy, frontend routes và cấu hình Compose.

Kết quả: **27/27 PASS**.

### 3. Frontend syntax

Dùng TypeScript compiler parser để parse toàn bộ `.ts/.tsx`.

Kết quả: **49 files, 0 syntax diagnostics**.

### 4. Configuration syntax

Đã parse thành công:

- `frontend/package.json`
- `docker-compose.yml`
- `backend/src/main/resources/application.yml`
- `backend/pom.xml`

### 5. Java source syntax scan

`javac` không phát hiện diagnostic kiểu syntax (`illegal start`, `';' expected`, `reached end of file`, ...).

## Test có sẵn để chạy trên máy có Docker

Chạy:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-v10.ps1
```

Script sẽ kiểm tra end-to-end:

1. Admin login.
2. Tạo tài khoản STAFF.
3. Sửa tài khoản STAFF.
4. Tạo ca hiện tại.
5. Từ chối ca chồng giờ.
6. STAFF login.
7. Gate bị khóa trước chấm công.
8. Bắt đầu ca.
9. Gate mở trong ca.
10. Kết thúc ca.
11. Gate khóa lại.

## Giới hạn môi trường kiểm tra hiện tại

Môi trường tạo source không có Docker daemon/Maven và không có internet để tải Maven dependencies, nên chưa thể chạy `docker compose up`, `mvn test` hoặc API smoke test thật tại đây. Source có thêm JUnit test `StaffShiftRulesTest` để chạy khi Maven có sẵn.
