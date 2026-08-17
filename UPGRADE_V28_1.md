# CineBooking V28.1 - Local Artifact Verifier Hotfix

V28.1 fixes a false-positive in `tools/verify_v28_ci.py`.

V28 originally failed diagnostics whenever a developer workstation contained `.env` or `backups/*.dump`. Those files are expected runtime/local files in CineBooking: `.env` provides local secrets and V27 intentionally creates database dumps.

V28.1 changes the security check to the property that actually matters:

- `.env` must not be tracked by Git.
- `backups/*.dump` must not be tracked by Git.
- The existing `.gitignore` rules remain required as the fallback when Git metadata is unavailable.
- Local untracked `.env` and backup dumps are reported as `INFO`, not failures.
- If either sensitive file type is force-added to Git, the verifier still fails.

## Upgrade from V28

Replace only:

- `tools/verify_v28_ci.py`
- `tools/diagnose-v28.ps1`

No Docker rebuild, database restart, or backup regeneration is required.

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v28.ps1
```

Expected result:

```text
53/53 checks passed
PASS: docker compose config
V28.1 DIAGNOSTICS PASSED
```

Optional verification that local sensitive files are ignored:

```powershell
git status --ignored --short .env backups
```

Do not use `git add -f` on `.env` or `backups/*.dump`.
