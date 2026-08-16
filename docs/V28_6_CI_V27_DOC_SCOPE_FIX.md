# V28.6 - V27 documentation scope verifier fix

V28.6 fixes the final V27 CI documentation false-positive. The V27 data-safety verifier now validates the dedicated `docs/V27_DATABASE_BACKUP_RESTORE.md` warning directly instead of also requiring the root README to repeat the same warning.

The required safety statement remains: do not use `docker compose down -v` when preserving the current PostgreSQL data volume.

No runtime, Docker, database, backup, or restore behavior changes.
