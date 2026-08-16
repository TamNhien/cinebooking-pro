# Upgrade V28.4 -> V28.5

This is a CI/source-verifier-only hotfix.

## Files changed

- `tools/verify_v27_data_safety.py`
- `tools/diagnose-v28.ps1`
- `docs/V28_5_V27_GIT_SAFETY_VERIFIER_FIX.md`
- `UPGRADE_V28_5.md`

## Apply

Copy the patch over the existing V28.4 tree, then run:

```powershell
python .\tools\verify_v27_data_safety.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v28.ps1
```

Expected V27 verifier result:

```text
35/35 checks passed
```

A local `.env` and local database dumps are allowed. They must stay untracked by Git.

No Docker rebuild or database restart is required.
