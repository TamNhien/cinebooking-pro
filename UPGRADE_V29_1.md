# Upgrade to V29.1

1. Apply the V29.1 hotfix over V29.
2. Run `python .\tools\verify_v28_ci.py` and expect 53/53.
3. Run `python .\tools\verify_v29_1_checkout_compat.py` and expect 6/6.
4. Run `powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v29.ps1`.
5. Confirm `.env` and database dumps remain untracked, then commit and push.

This patch does not deploy production and does not require real secrets.
