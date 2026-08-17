# Upgrade V28.6 -> V28.7

V28.7 adds a safe frontend ESLint legacy baseline.

Changes:
- Four pre-existing high-volume lint rules are warnings, not disabled.
- Frontend lint becomes a real CI gate (no `continue-on-error`).
- Production build remains mandatory.
- Adds `tools/verify_v28_7_lint_baseline.py`.

No database, Docker runtime, JWT, Flyway, or PWA behavior changes.
