# V28.4 - CI docs-regression compatibility fix

V28.4 fixes a false negative in `tools/verify_v27_data_safety.py`.

The V27 safety documentation correctly warns:

```text
Do **not** use `docker compose down -v`
```

The previous verifier only accepted the exact unformatted phrase `Do not use ...`, so Markdown emphasis caused CI to fail even though the warning was present.

The verifier now accepts both plain text and Markdown-bold `not`, while still requiring the exact destructive command `docker compose down -v` to be documented.

No database, Docker image, backend runtime, frontend runtime, JWT secret, or backup file is changed by this patch.
