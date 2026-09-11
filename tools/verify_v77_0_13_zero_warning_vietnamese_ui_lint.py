from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel):
    return (ROOT / rel).read_text(encoding="utf-8")

def ok(cond, msg):
    checks.append(bool(cond))
    print(f"[ {'OK' if cond else 'FAIL'} ] {msg}")

admin = text("frontend/app/admin/page.tsx")
showtimes = text("frontend/app/admin/showtimes/page.tsx")
readme = text("README.md")
ci = text(".github/workflows/ci.yml")
release = text("scripts/release.ps1")
diagnose = text("tools/diagnose-v77.ps1")
makefile = text("Makefile")
old = text("tools/verify_v77_0_12_typescript_localization_contract_hygiene.py")

ok('import Link from "next/link";' in admin, "Admin dashboard imports Next Link")
ok('<Link href="/" data-testid="admin-booking-seat-intelligence-v57"' in admin, "V57 dashboard entry uses Next Link for internal root navigation")
ok('<a href="/" data-testid="admin-booking-seat-intelligence-v57"' not in admin, "V57 dashboard entry no longer uses raw anchor to internal root")
ok('Đặt vé & gợi ý ghế V57' in admin, "V57 visible label remains Vietnamese")
ok('data-testid="admin-operations-control-v58"' in admin and 'Trung tâm vận hành V58' in admin, "V58 dashboard entry remains present and Vietnamese")
ok('import { viLabel } from "@/lib/vi-labels";' not in showtimes, "Showtime planner removes unused viLabel import")
ok('planningScore' in showtimes, "Showtime planner machine property remains planningScore")
ok('V77.0.13' in readme and 'ESLint' in readme, "README documents V77.0.13 lint repair")
ok('verify_v77_0_13_zero_warning_vietnamese_ui_lint.py' in ci, "CI runs V77.0.13 lint verifier")
ok('verify_v77_0_13_zero_warning_vietnamese_ui_lint.py' in release, "Stable release preflight runs V77.0.13 verifier")
ok('verify_v77_0_13_zero_warning_vietnamese_ui_lint.py' in diagnose, "V77 diagnostics chain V77.0.13 verifier")
ok('verify-v77-zero-warning-vietnamese-ui-lint' in makefile, "Makefile exposes V77.0.13 verifier")
ok('release-v77-0-12' in makefile and 'v77.0.12' in makefile, "Makefile preserves explicit V77.0.12 release target")
ok('v77.0.13' in makefile, "Makefile latest V77 patch target is v77.0.13")
ok('V77.0.12' in old, "Historical V77.0.12 verifier remains present")
ok('V72' in readme and '67 public tables' in readme, "V77.0.13 remains no-schema on Flyway V72 / 67 public tables")

passed = sum(checks)
print(f"\nV77.0.13 zero-warning Vietnamese UI lint verification: {passed}/{len(checks)} checks passed")
raise SystemExit(0 if all(checks) else 1)
