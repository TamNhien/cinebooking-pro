# V28.2 - CI `.env.example` hotfix

GitHub Actions checks the V26.1 JWT hardening contract, including the repository root `.env.example` file.
The local runtime `.env` is intentionally ignored and must never be committed, but `.env.example` is a safe template and must be committed.

V28.2:

- restores the root `.env.example` template to source control;
- keeps `.env` ignored;
- keeps `backups/*.dump` ignored;
- makes `verify_v26_1_security.py` report a normal failed check if `.env.example` is missing instead of raising `FileNotFoundError`;
- does not contain real credentials or database backups.

After applying the patch:

```powershell
git add .env.example tools/verify_v26_1_security.py docs/V28_2_CI_ENV_EXAMPLE_FIX.md
git commit -m "Fix V28 CI env example regression"
git push
```
