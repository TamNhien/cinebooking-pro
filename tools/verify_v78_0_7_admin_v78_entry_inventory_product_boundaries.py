from pathlib import Path
import re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
checks = []

def text(rel):
    p = ROOT / rel
    return p.read_text(encoding="utf-8") if p.exists() else ""

def ok(cond, label):
    cond = bool(cond)
    checks.append(cond)
    print(f"[ {'OK' if cond else 'FAIL'} ] {label}")

admin = text("frontend/app/admin/page.tsx")
header = text("frontend/components/Header.tsx")
v78page = text("frontend/app/admin/ux-accessibility-pwa/page.tsx")
inventory = text("frontend/app/admin/inventory/page.tsx")
e2e = text("frontend/e2e/v78-language-accessibility-pwa.spec.ts")
sw = text("frontend/public/sw.js")
readme = text("README.md")
release = text("scripts/release.ps1")
ci = text(".github/workflows/ci.yml")
make = text("Makefile")
diag = text("tools/diagnose-v78.ps1")

ok('data-testid="admin-ux-accessibility-pwa-v78"' in admin and 'href="/admin/ux-accessibility-pwa"' in admin,
   "Admin Dashboard visibly exposes the V78 tile")
ok('t("♿ UX & PWA V78","♿ UX & PWA V78")' in admin,
   "V78 dashboard tile keeps explicit presentation ownership")
ok(header.count('href="/admin/ux-accessibility-pwa"') >= 2 and 'UX & PWA V78' in header,
   "Mobile and desktop Admin menus expose V78 consistently")
ok('data-testid="ux-accessibility-pwa-v78"' in v78page and 'usePresentationLanguage' in v78page,
   "Dedicated V78 UX/Accessibility/PWA surface exists and owns VI/EN copy")
ok('/login?returnTo=/admin/ux-accessibility-pwa&reason=admin' in v78page and 'me.role!=="ADMIN"' in v78page,
   "Dedicated V78 surface remains Admin-authorized")
ok('"/admin/ux-accessibility-pwa"' in e2e,
   "V78 browser sweep covers the visible V78 Admin surface")
ok('admin-ux-accessibility-pwa-v78' in e2e and 'toHaveAttribute("href", "/admin/ux-accessibility-pwa")' in e2e,
   "Focused V78 journey proves the dashboard V78 entry")
ok(('data-testid="inventory-product-name-v7807" data-i18n-skip="true">{p.name}</h3>' in inventory) or ('data-testid="inventory-product-name-v7807">{concessionProductName(p.name,language)}</h3>' in inventory),
   "Inventory product-card names preserve business data or localize only controlled concession vocabulary")
ok(('data-testid="inventory-movement-product-name-v7807" data-i18n-skip="true">{m.productName}</h3>' in inventory) or ('data-testid="inventory-movement-product-name-v7807" data-i18n-skip="true">{concessionProductName(m.productName,language)}</h3>' in inventory),
   "Inventory mobile movement names preserve raw business data or controlled concession localization")
ok(not re.search(r'data-testid="inventory-product-card"[^>]*data-i18n-skip="true"', inventory),
   "Inventory product cards are not globally exempted from the language sweep")
ok('inventory-product-name-v7807' in e2e and (('toHaveAttribute("data-i18n-skip", "true")' in e2e) or ('not.toHaveAttribute("data-i18n-skip", "true")' in e2e and 'concessionProductName' in inventory)),
   "Focused V78 journey proves either raw product boundaries or controlled concession localization")
ok('data-testid="inventory-v48"' in inventory and not re.search(r'data-testid="inventory-v48"[^>]*data-i18n-skip="true"', inventory),
   "Inventory root remains fail-closed")
ok(any(x in sw for x in ['const VERSION = "v78-0-7";','const VERSION = "v78-0-8";','const VERSION = "v78-0-9";','const VERSION = "v78-0-10";','const VERSION = "v78-0-11";','const VERSION = "v78-0-12";','const VERSION = "v78-0-13";','const VERSION = "v78-0-14";','const VERSION = "v78-0-15";','const VERSION = "v78-0-16";','const VERSION = "v78-0-17";','const VERSION = "v78-0-18";','const VERSION = "v78-0-19";','const VERSION = "v78-0-20";']),
   "Service Worker generation is V78.0.7 or forward-compatible V78.0.8")

migrations=list((ROOT/'backend/src/main/resources/db/migration').glob('V*.sql'))
latest=max(int(re.match(r'V(\d+)',x.name).group(1)) for x in migrations if re.match(r'V(\d+)',x.name))
ok(latest==72 and not list((ROOT/'backend/src/main/resources/db/migration').glob('V78*.sql')),
   "V78.0.7 remains no-schema on Flyway V72")
name='verify_v78_0_7_admin_v78_entry_inventory_product_boundaries.py'
ok(name in release and name in ci and name in diag,
   "Release, CI and V78 diagnostics execute V78.0.7 verifier")
ok('verify-v78-0-7' in make and 'release-v78-0-7' in make,
   "Makefile exposes V78.0.7 verify/release lifecycle")
ok(any(x in readme for x in ['Current release:** V78.0.7','Current release:** V78.0.8','Current release:** V78.0.9','Current release:** V78.0.10','Current release:** V78.0.11','Current release:** V78.0.12','Current release:** V78.0.13','Current release:** V78.0.14','Current release:** V78.0.15','Current release:** V78.0.16','Current release:** V78.0.17','Current release:** V78.0.18','Current release:** V78.0.19','Current release:** V78.0.20']) and 'V78.0.7' in readme and 'V78 Visibility / Inventory Product Business-Data Boundaries' in readme,
   "README preserves V78.0.7 visibility and inventory product-boundary fix under forward release metadata")
ok([p.name for p in ROOT.glob('*.md')]==['README.md'],
   "Source keeps one consolidated root README.md")

prev=subprocess.run([sys.executable,'-X','utf8',str(ROOT/'tools/verify_v78_0_6_inventory_presentation_language_business_boundaries.py')],cwd=ROOT,text=True,encoding='utf-8',errors='replace',capture_output=True)
ok(prev.returncode==0 and '18/18 checks passed' in prev.stdout,
   "V78.0.6 and earlier V78 lineage remain forward-compatible with V78.0.7")

passed=sum(checks)
print(f"\nV78.0.7 Admin V78 entry / Inventory product business-data boundary verification: {passed}/{len(checks)} checks passed")
sys.exit(0 if passed==len(checks) else 1)
