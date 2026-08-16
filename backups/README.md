# CineBooking V27 database backups

This directory is bind-mounted into the PostgreSQL container as `/backups`.

- `*.dump` files are PostgreSQL custom-format archives created by `tools/backup-db.ps1`.
- `*.dump.sha256` files contain the matching SHA-256 checksum.
- Dump and checksum files are ignored by Git.
- Keep at least one verified backup outside the project folder for important environments.

Do not edit `.dump` files manually.
