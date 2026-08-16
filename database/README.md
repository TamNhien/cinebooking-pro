# PostgreSQL cho CineBooking Pro

## SQL của dự án nằm ở đâu?

Dự án dùng **Flyway Migration**. Hai file SQL chính là:

- `backend/src/main/resources/db/migration/V1__init.sql`: tạo bảng, khóa ngoại, index, unique constraint.
- `backend/src/main/resources/db/migration/V2__seed_demo.sql`: dữ liệu demo phim/rạp/phòng/ghế/suất chiếu.

Khi Spring Boot kết nối được vào database `cinebooking`, Flyway sẽ tự chạy các file này theo thứ tự `V1`, `V2`. Vì vậy **không cần chạy V1/V2 thủ công** trong cách chạy Docker mặc định.

## Kết nối PostgreSQL Docker bằng pgAdmin / DBeaver

Mặc định dự án map PostgreSQL ra máy host ở cổng `5433` để tránh đụng PostgreSQL local thường dùng `5432`.

- Host: `localhost`
- Port: `5433`
- Database: `cinebooking`
- Username: `cinebooking`
- Password: `cinebooking`

Các giá trị này có thể đổi trong file `.env`.

## Nếu muốn tự tạo database bằng PostgreSQL cài trên Windows

1. Tạo role/user và database bằng tài khoản quản trị PostgreSQL (thường là `postgres`):

```sql
CREATE ROLE cinebooking WITH LOGIN PASSWORD 'cinebooking';
CREATE DATABASE cinebooking OWNER cinebooking;
```

2. Đổi `SPRING_DATASOURCE_URL`, username/password cho backend nếu không dùng PostgreSQL Docker.
3. Chạy backend. Flyway sẽ tự tạo schema/tables và seed demo.

> Không nên vừa chạy V1/V2 thủ công vừa để Flyway chạy lần đầu trên cùng một database rỗng, vì Flyway cần quản lý lịch sử migration bằng bảng `flyway_schema_history`.


## V27 — Backup/restore an toàn

V27 cung cấp bộ script PowerShell dùng trực tiếp `pg_dump`/`pg_restore` bên trong container PostgreSQL 18:

```powershell
# Chẩn đoán
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v27.ps1

# Backup + SHA-256 + verify
powershell -ExecutionPolicy Bypass -File .\tools\backup-db.ps1

# Verify một dump
powershell -ExecutionPolicy Bypass -File .\tools\verify-db-backup.ps1 -BackupFile ".\backups\<file>.dump"

# Test restore trên database tạm, không phá DB thật
powershell -ExecutionPolicy Bypass -File .\tools\test-v27.ps1

# Restore thật: bắt buộc flag xác nhận và mặc định tạo safety backup
powershell -ExecutionPolicy Bypass -File .\tools\restore-db.ps1 -BackupFile ".\backups\<file>.dump" -ConfirmRestore
```

Không chạy `docker compose down -v` khi nâng cấp hoặc sửa lỗi thông thường vì `-v` xóa named volume PostgreSQL. Chi tiết: `docs/V27_DATABASE_BACKUP_RESTORE.md`.
