# V30.1 Frontend Toolchain Guard

V30.1 stabilizes the frontend lint/typecheck dependency boundary after incompatible Dependabot major updates were observed in CI.

## Why

The validated V30 frontend uses ESLint 9 and TypeScript 5. Dependabot PRs that independently upgraded ESLint to 10 or TypeScript to 7 caused the lint job to fail before application lint rules could run.

V30.1 therefore keeps automated minor/patch updates on the current majors while ignoring semver-major updates for these two toolchain dependencies. Major upgrades remain possible, but they must be done deliberately as a coordinated compatibility upgrade.

## Changes

- Keep `frontend/package.json` on the validated ESLint 9 / TypeScript 5 major lines.
- Configure frontend npm Dependabot to ignore semver-major updates for `eslint` and `typescript`.
- Add `tools/verify_v30_1_frontend_toolchain.py` to CI and local diagnostics.
- Keep V28.7 warning baseline and all V30 application behavior unchanged.

No database migration, production secret, registry login, or deployment behavior is changed.
