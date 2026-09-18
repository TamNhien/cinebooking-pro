from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
checks = []


def text(rel: str) -> str:
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""


def ok(condition, label: str) -> None:
    passed = bool(condition)
    checks.append(passed)
    print(f"[ {'OK' if passed else 'FAIL'} ] {label}")


css = text("frontend/app/globals.css")
home = text("frontend/app/page.tsx")
recommendation = text("frontend/lib/recommendation-presentation.ts")
catalog = text("frontend/lib/presentation-ui-translations-v78.ts")
legacy = text("frontend/components/LegacyUiLocalizationBridge.tsx")
api = text("frontend/lib/api.ts")
bookings = text("frontend/app/admin/bookings/page.tsx")
system = text("frontend/lib/system-presentation.ts")
r3 = text("tools/verify_v78_0_19_r3_table_center_language_inventory_closure.py")
release = text("scripts/release.ps1")
ci = text(".github/workflows/ci.yml")
diag = text("tools/diagnose-v78.ps1")
make = text("Makefile")
readme = text("README.md")

# Home requested removal + recommendation dynamic EN closure.
ok("recommendationProfileSummary" not in home and "profileSummary" not in home,
   "Home personalized profile sentence ('CineBooking ưu tiên ...') is removed")
ok("function recommendationGenreListLabel" in recommendation and ".split(/\\s*,\\s*/u)" in recommendation,
   "Recommendation reasons translate comma-separated controlled genre lists")
ok(recommendation.count('recommendationGenreListLabel(match[1], "en")') >= 5,
   "All matched-genre recommendation reason templates use the genre-list renderer")
ok('movieLanguageLabel(match[2], "en")' in recommendation,
   "Recommendation language capture still translates Tiếng Việt -> Vietnamese")

# Requested EN labels / dynamic runtime messages.
for vi, en in [
    ("Mã giao dịch", "Transaction ID"),
    ("Mã giao dịch cổng", "Gateway transaction ID"),
    ("Mã đơn tại cổng", "Gateway order ID"),
    ("Bởi", "By"),
    ("MÃ ĐẶT VÉ", "BOOKING CODE"),
]:
    ok(f'"{vi}": "{en}"' in catalog, f"Catalog owns {vi} -> {en}")
step_vi = "Thao tác nhạy cảm yêu cầu xác thực tăng cường V68. Hãy mở Security & Identity, nhập lại mật khẩu Admin rồi thử lại."
step_en = "This sensitive action requires V68 step-up authentication. Open Security & Identity, re-enter the Admin password, then try again."
ok(step_vi in catalog and step_en in catalog,
   "Full-source catalog owns the V68 step-up blocked-action message")
ok(step_vi in api and step_en in api and "localizedApiMessage(await parseError(res))" in api,
   "API errors localize the backend-owned V68 step-up message before render")
ok('t("Mã giao dịch","Transaction ID")' in bookings,
   "Admin Booking payment detail renders Transaction ID explicitly in EN")
ok('t("Bởi","By")' in bookings,
   "Admin Booking checked-in attribution renders By explicitly in EN")
ok('t("MÃ ĐẶT VÉ","BOOKING CODE")' in bookings,
   "Admin Booking modal booking-code label is explicitly bilingual")
ok('Mã giao dịch:\\s*(.*)' in legacy and 'Bởi\\s+(.+)' in legacy,
   "Legacy bridge also covers combined dynamic Transaction ID / By text nodes")

# Source-wide table alignment, not only TH/TD inheritance.
ok('.app-main table th *,' in css and '.app-main table td * {' in css and 'text-align:center !important;' in css,
   "Table descendant text is centered even when nested elements have local alignment classes")
ok('.app-main table td :where(.flex,.inline-flex)' in css and 'justify-content:center !important;' in css,
   "Nested flex content inside table cells is geometrically centered")
table_files = []
table_tags = 0
alignment_overrides = []
for base in (ROOT / "frontend/app", ROOT / "frontend/components"):
    for path in base.rglob("*.tsx"):
        source = path.read_text(encoding="utf-8")
        for m in re.finditer(r"<table\b.*?</table>", source, re.S):
            block = m.group(0)
            table_tags += 1
            if path not in table_files:
                table_files.append(path)
            if "text-left" in block or "text-right" in block:
                alignment_overrides.append(str(path.relative_to(ROOT)))
ok(len(table_files) >= 32 and table_tags >= 45,
   f"Source-wide table audit covers {len(table_files)} TSX files / {table_tags} table instances")
ok(not alignment_overrides,
   f"No table-local text-left/text-right override remains (hits={len(alignment_overrides)})")

# Attached release failure: exact EOF/whitespace closure.
system_path = ROOT / "frontend/lib/system-presentation.ts"
raw = system_path.read_bytes()
ok(raw.endswith(b"\n") and not raw.endswith(b"\n\n"),
   "system-presentation.ts has exactly one LF at EOF")
changed_candidates = [
    "frontend/app/page.tsx",
    "frontend/lib/recommendation-presentation.ts",
    "frontend/app/globals.css",
    "frontend/app/admin/bookings/page.tsx",
    "frontend/lib/presentation-ui-translations-v78.ts",
    "frontend/components/LegacyUiLocalizationBridge.tsx",
    "frontend/lib/api.ts",
    "frontend/lib/system-presentation.ts",
    "tools/verify_v78_0_19_r3_table_center_language_inventory_closure.py",
]
whitespace_hits = []
for rel in changed_candidates:
    p = ROOT / rel
    if not p.exists():
        whitespace_hits.append(rel + ":missing")
        continue
    lines = p.read_text(encoding="utf-8").splitlines()
    if any(line.endswith(" ") or line.endswith("\t") for line in lines):
        whitespace_hits.append(rel + ":trailing")
    b = p.read_bytes()
    if not b.endswith(b"\n") or b.endswith(b"\n\n"):
        whitespace_hits.append(rel + ":eof")
ok(not whitespace_hits,
   f"R4 runtime/compatibility files are staging-whitespace clean (hits={len(whitespace_hits)})")
ok("git diff --cached --check" in release,
   "Stable release still fails closed on staged whitespace before publication")

# Historical R3 gate is forward-compatible with the explicit removal/list renderer.
ok("intentionally omitted by a later patch" in r3,
   "Historical R3 verifier accepts the requested removal of the Home profile sentence")
ok("recommendationGenreListLabel(match[1], \"en\")" in r3,
   "Historical R3 verifier accepts the comma-separated genre renderer")

# R4 release lifecycle + no schema.
name = "verify_v78_0_19_r4_language_table_release_closure.py"
ok(name in release and name in ci and name in diag,
   "Stable preflight, GitHub CI and V78 diagnostics execute the R4 verifier")
ok("verify-v78-0-19-r4" in make and "release-v78-0-19-r4" in make,
   "Makefile exposes R4 verify/release lifecycle")
ok("V78.0.19-R4" in readme and "Language / Table Center / Release Whitespace Closure" in readme,
   "README records R4 in the single consolidated history")
ok([p.name for p in ROOT.glob("*.md")] == ["README.md"],
   "Source keeps exactly one consolidated root README.md")
migrations = list((ROOT / "backend/src/main/resources/db/migration").glob("V*.sql"))
latest = max(int(re.match(r"V(\d+)", p.name).group(1)) for p in migrations if re.match(r"V(\d+)", p.name))
ok(latest == 72 and not list((ROOT / "backend/src/main/resources/db/migration").glob("V78*.sql")),
   "R4 remains no-schema on Flyway V72")

passed = sum(checks)
print(f"\nV78.0.19-R4 Language / Table Center / Release Whitespace Closure verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
