# CineBooking V28.8

V28.8 fixes the GitHub Actions backend Testcontainers integration startup failure caused by the poster storage service attempting to create the production `/app/uploads` directory on the host runner.

Changes:

- Integration tests use `target/it-uploads` for `app.upload.dir`.
- Production still defaults to `/app/uploads` through `UPLOAD_DIR`.
- Added `tools/verify_v28_8_test_storage.py`.
- Added V28.8 verification to source regression and local V28 diagnostics.

No database migration or production data change is included.
