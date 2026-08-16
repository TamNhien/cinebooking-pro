# Upgrade V28.3 -> V28.4

Copy the hotfix over the existing project, then run:

```powershell
python .\tools\verify_v27_data_safety.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v28.ps1
git add -A
git commit -m "Fix V28 CI V27 docs regression"
git push
```

No Docker rebuild or database restart is required.
