# Upgrade V28.5 -> V28.6

Copy the V28.6 hotfix over V28.5. No Docker rebuild or database restart is required.

Then run:

```powershell
python .\tools\verify_v27_data_safety.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v28.ps1
```

Expected V27 result: `35/35 checks passed`.
