# Upgrade to V30.1

V30.1 is a CI/toolchain compatibility patch on top of V30.

After applying the patch, run:

```powershell
python .\tools\verify_v30_1_frontend_toolchain.py
powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v30.ps1
```

Expected V30.1 verifier result:

```text
10/10 checks passed
```

Existing Dependabot PRs that upgrade ESLint to 10 or TypeScript to 7 should not be merged into this baseline. Close those incompatible major-upgrade PRs after V30.1 reaches `main`. Dependabot can continue proposing minor/patch updates on ESLint 9 and TypeScript 5.
