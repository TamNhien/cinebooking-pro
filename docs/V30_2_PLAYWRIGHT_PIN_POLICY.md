# V30.2 Playwright pin policy

## Problem

`verify_v29_2_playwright_e2e.py` treated `1.60.0` as the definition of "pinned". That couples a structural verifier to one patch version and can create a false failure after a legitimate patch-only dependency refresh.

## Policy

- `@playwright/test` must be an exact version, not `^`/`~`/range notation.
- The validated compatibility line is `1.60.x`.
- Dependabot may surface patch updates on that line.
- Playwright minor/major updates are held for explicit browser/runtime review.
- Existing Playwright Chromium install and E2E runtime gates remain unchanged.

This is a CI/tooling-only patch.
