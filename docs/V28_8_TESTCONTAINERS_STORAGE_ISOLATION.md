# V28.8 Testcontainers upload-storage isolation

## Failure

The GitHub Actions integration test booted PostgreSQL and Redis Testcontainers and successfully applied all Flyway migrations, but the Spring application context failed while creating `PosterStorageService`.

The production upload default is `/app/uploads`. That path is valid inside the backend Docker image, but the Maven integration test runs directly on the GitHub-hosted runner. The runner process must not create `/app`, so startup failed with `AccessDeniedException: /app`.

## Fix

`CineBookingIntegrationIT` now overrides only the integration-test property:

```text
app.upload.dir=target/it-uploads
```

This keeps test-generated files inside Maven's writable `target` workspace while leaving the production default unchanged:

```text
UPLOAD_DIR=/app/uploads
```

No database migration, Docker volume, runtime upload URL, or production storage behavior is changed.
