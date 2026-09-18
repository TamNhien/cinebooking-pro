#!/usr/bin/env python3
from pathlib import Path
import hashlib
import os
import re

ROOT = Path(__file__).resolve().parents[1]
checks=[]

def text(rel): return (ROOT/rel).read_text(encoding="utf-8")
def ok(cond,msg):
    checks.append(bool(cond))
    print(f"[ {'OK' if cond else 'FAIL'} ] {msg}")
def sha(rel):
    return hashlib.sha256((ROOT/rel).read_bytes()).hexdigest()

admin=text("frontend/app/admin/page.tsx")
v57=text("frontend/app/admin/booking-seat-intelligence/page.tsx")
header=text("frontend/components/Header.tsx")
provider=text("frontend/components/LanguageProvider.tsx")
switcher=text("frontend/components/LanguageSwitcher.tsx")
layout=text("frontend/app/layout.tsx")
css=text("frontend/app/globals.css")
helper=text("frontend/lib/usePresentationLanguage.ts")
customer=text("frontend/app/admin/customer-value/page.tsx")
e2e=text("frontend/e2e/customer-value-v56.spec.ts")
risk=text("frontend/app/admin/risk/page.tsx")
labels=text("frontend/lib/vi-labels.ts")
readme=text("README.md")
ci=text(".github/workflows/ci.yml")
release=text("scripts/release.ps1")
diagnose=text("tools/diagnose-v77.ps1")
make=text("Makefile")
analytics=text("frontend/app/admin/analytics/page.tsx")

# V77.0.14 functional fixes retained.
ok('href="/admin/booking-seat-intelligence" data-testid="admin-booking-seat-intelligence-v57"' in admin,"V57 dashboard shortcut still targets the dedicated Admin page")
ok('api<Showtime[]>("/admin/showtimes")' in v57,"V57 still reads real showtime data")
ok('api<Booking[]>("/admin/bookings")' in v57,"V57 still reads real booking data")
ok('href={`/booking/${s.id}`}' in v57,"V57 still opens the real seat map")
ok('profile.role!=="ADMIN"' in v57,"V57 keeps the Admin authorization gate")
ok(('href="/admin/booking-seat-intelligence">Đặt vé & gợi ý ghế V57' in header) or ('href="/admin/booking-seat-intelligence"' in header and 't("Đặt vé & gợi ý ghế V57","Booking & seat intelligence V57")' in header),"Header keeps the dedicated V57 route")
ok('select.input { min-height:52px' in css,"Native select readability fix remains")
ok('padding:.82rem 2.6rem .82rem .95rem' in css,"Native select padding fix remains")

# Exact V77.0.0 language core. Hashes are from the user-supplied V77.0.0 source.
centralized_provider = "useSyncExternalStore<Language>" in provider and "browserLanguageSnapshot" in provider
single_state_provider = 'useState<Language>("vi")' in provider and "browserLanguageSnapshot" in provider
ok(sha("frontend/components/LanguageProvider.tsx") == "a5542afff5ddf98fc64a0b6eb693d445ee449e5cb4dc1d2461dcf23567e8d234" or centralized_provider or single_state_provider, "LanguageProvider preserves the V77.0.0 contract or uses a forward-compatible centralized language source")
ok(sha("frontend/components/LanguageSwitcher.tsx") == "58fa15872d8a2ff140cda34e1198e98e8475d6953a4137957cb35be75f8fc9f9" or all(x in switcher for x in ['data-testid="language-switch-vi"','data-testid="language-switch-en"','setLanguage("vi")','setLanguage("en")']), "LanguageSwitcher preserves V77.0.0 behavior or adds forward-compatible stable bilingual controls")
ok(sha("frontend/app/layout.tsx") == "9f54ede92dcfed99441b2d2bb8643b6ff0fe728e096cf865f608be38b9cc4389" or all(x in layout for x in ['cinebooking_language','document.documentElement.lang','suppressHydrationWarning']), "Root layout keeps V77.0.0 flow or adds only durable pre-hydration language restore")
ok('useState<Language>("vi")' in provider or "(): Language => \"vi\"" in provider,"V77.0.0 flow initializes Vietnamese")
ok('window.localStorage.getItem(STORAGE_KEY)' in provider and (('saved === "vi" || saved === "en"' in provider) or "normalizeLanguage" in provider),"V77.0.0 flow restores a persisted VI/EN preference")
ok('window.localStorage.setItem(STORAGE_KEY, next)' in provider,"V77.0.0 flow persists every language click")
ok('document.documentElement.lang = next' in provider,"V77.0.0 flow synchronizes document.lang on change")
ok(('window.dispatchEvent(new CustomEvent("language-changed", { detail: next }))' in provider) or ('window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }))' in provider),"V77.0.0 compatibility language-changed event is preserved")
ok(('react-hooks/set-state-in-effect' in provider and 'eslint-disable' in provider) or centralized_provider or (single_state_provider and ('queueMicrotask(reconcileFromBrowser)' in provider or ('reconcileFromBrowser();' in provider and 'requestAnimationFrame(reconcileFromBrowser)' in provider))),"V77.0.0 restore path remains zero-warning (legacy effect, external store, or bounded single-state reconciliation)")
ok(re.search(r'>\s*VN\s*<',switcher) is not None and re.search(r'>\s*EN\s*<',switcher) is not None,"V77.0.0 switcher exposes both VN and EN")
ok('onClick={() => setLanguage("vi")}' in switcher and 'onClick={() => setLanguage("en")}' in switcher,"V77.0.0 switcher uses the provider setLanguage path")
ok('className="language-dots"' in switcher and '<span/><span/><span/><span/><span/><span/>' in switcher,"V77.0.0 language dots are preserved")
ok('.language-switcher-wrap { display:flex; flex-direction:column; align-items:stretch; width:82px;' in css,"V77.0.0 desktop language selector sizing is restored")
ok('header .language-switcher-wrap { width:64px; }' in css,"V77.0.0 mobile header language selector width is restored")

# New V77.0.14 pages consume the old provider state without changing that provider's runtime contract.
ok('const { language, setLanguage } = useLanguage();' in helper,"Compatibility presentation hook reads the V77.0.0 provider state")
ok('language === "en" ? en : vi' in helper,"Compatibility presentation hook selects VI/EN by the old language state")
ok('language === "en" ? "en-US" : "vi-VN"' in helper,"Locale follows the V77.0.0 language state")
RUNTIME_SCAN_SKIP_DIRS = {
    "node_modules", ".next", "playwright-report", "test-results", "blob-report",
    "coverage", "dist", "out", ".turbo", ".git",
}
RUNTIME_SCAN_SUFFIXES = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"}

def runtime_refs(module_name):
    hits=[]
    obsolete={
        (ROOT/"frontend/lib/i18n-runtime.ts").resolve(),
        (ROOT/"frontend/lib/i18n-en-supplement.ts").resolve(),
        (ROOT/"frontend/lib/i18n-static-catalog.generated.ts").resolve(),
    }
    frontend = ROOT/"frontend"
    # Do not walk generated/runtime dependency trees. Apart from being irrelevant to
    # application-source verification, files inside node_modules may be unreadable
    # on Windows (for example Next.js compiled artifacts), which must never make the
    # verifier fail.
    for dirpath, dirnames, filenames in os.walk(frontend, topdown=True, followlinks=False):
        dirnames[:] = [name for name in dirnames if name not in RUNTIME_SCAN_SKIP_DIRS]
        base = Path(dirpath)
        for filename in filenames:
            path = base/filename
            if path.suffix not in RUNTIME_SCAN_SUFFIXES:
                continue
            try:
                resolved = path.resolve()
            except OSError:
                resolved = path
            if resolved in obsolete:
                continue
            try:
                body=path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            if module_name in body:
                hits.append(path.relative_to(ROOT).as_posix())
    return hits

ok("node_modules" in RUNTIME_SCAN_SKIP_DIRS and ".next" in RUNTIME_SCAN_SKIP_DIRS,"Verifier ignores dependency/build artifact trees when scanning runtime references")
ok(not runtime_refs("i18n-runtime"),"Post-V77.0.0 DOM translation runtime is not referenced by application code")
ok(not runtime_refs("i18n-en-supplement"),"Post-V77.0.0 English supplement runtime is not referenced by application code")
ok(not runtime_refs("i18n-static-catalog.generated"),"Post-V77.0.0 generated DOM translation catalog is not referenced by application code")
ok((ROOT/"tools/cleanup_v77_0_14_v7700_language_flow.ps1").exists(),"Cleanup helper removes stale post-V77.0.0 i18n files left by overlay extraction")
ok('MutationObserver' not in provider and (('useSyncExternalStore' not in provider) or (centralized_provider and "useSyncExternalStore" not in helper) or single_state_provider),"Language runtime avoids DOM observers and keeps a single language-store owner")
ok('usePresentationLanguage' in helper and 'useLanguage' in helper,"Newer pages adapt at render time without changing the V77.0.0 provider")


# V51 chart presentation: keep bars clean and distribute daily revenue across the full width.
ok('rounded-xl bg-slate-950/25' not in analytics,"V51 forecast bars no longer render dark rounded tiles around each column")
ok('rounded-xl bg-slate-950/20' not in analytics,"V51 daily-revenue bars no longer render dark rounded tiles around each column")
ok('gridTemplateColumns:`repeat(${Math.max(1,data.dailyRevenue.length)},minmax(0,1fr))`' in analytics,"V51 daily revenue distributes all rendered days evenly across the available width")
ok('xl:grid-cols-11' not in analytics,"V51 daily revenue no longer leaves unused fixed grid tracks on wide screens")

# Presentation/API safety retained.
ok('/admin/customer-value/scorecard?' in customer and '/admin/customer-value/điểmcard' not in customer,"Customer Value keeps the immutable /scorecard API route")
ok('const dispositionOptions = ["CLEARED","REVIEW","CHALLENGE","BLOCK_RECOMMENDED"] as const;' in risk,"V61 machine disposition values remain unchanged")
ok('body:JSON.stringify({disposition,note:notes[userId]||""})' in risk,"V61 API request still sends machine disposition values")
crm=(ROOT/"frontend/app/admin/crm-automation/page.tsx").read_text(encoding="utf-8")
ok("suppressionLabel(reason:string|null|undefined" in crm,"V77 CRM suppression labels accept nullable API reasons without TypeScript narrowing errors")
ok('if(!reason)return language==="vi"?"Không có lý do loại trừ":"No suppression reason"' in crm,"V77 CRM renders a safe bilingual fallback when suppression reason is absent")
for machine in ["ALL","PENDING","CONFIRMED","LOW","MEDIUM","HIGH","CRITICAL","CUSTOMER","PROCESSED"]:
    ok(re.search(rf'\b{machine}\s*:\s*"',labels) is not None,f"viLabel keeps {machine}")

# E2E now follows the exact V77.0.0 persistence/switch flow.
ok('exact V77.0.0 VN/EN language flow' in e2e,"Browser E2E names the V77.0.0 language contract explicitly")
ok('localStorage.removeItem("cinebooking_language")' in e2e and 'toHaveAttribute("lang", "vi")' in e2e,"Browser E2E verifies clean-profile VI initialization")
ok('localStorage.setItem("cinebooking_language", "en")' in e2e and 'toHaveAttribute("lang", "en"' in e2e,"Browser E2E verifies V77.0.0 persisted EN restore")
ok(('button[title="Tiếng Việt"]' in e2e or 'button[title=\"Tiếng Việt\"]' in e2e) and ('button[title="English"]' in e2e or 'button[title=\"English\"]' in e2e),"Browser E2E verifies both V77.0.0 language buttons with unambiguous selectors")
ok('toBe("vi")' in e2e and 'toBe("en")' in e2e,"Browser E2E verifies VI/EN persistence in localStorage")
ok('V77.0.0 language flow restoration' in readme,"README documents the intentional V77.0.0 language restoration")
ok('verify_v77_0_14_navigation_language_dropdown_localization.py' in ci and 'verify_v77_0_14_navigation_language_dropdown_localization.py' in release and 'verify_v77_0_14_navigation_language_dropdown_localization.py' in diagnose,"CI/release/diagnostics still run the V77.0.14 verifier")
ok('verify-v77-navigation-language-dropdown-localization:' in make,"Makefile still exposes V77.0.14 verification")


# Existing-admin E2E contract: reuse the admin already configured in root .env; never silently switch to a newer hardcoded account.
playwright_config=text("frontend/playwright.config.ts")
login_page=text("frontend/app/login/page.tsx")
register_page=text("frontend/app/register/page.tsx")
ok('localEnv.ADMIN_EMAIL' in playwright_config and 'localEnv.ADMIN_PASSWORD' in playwright_config,"Playwright resolves the existing ADMIN_EMAIL/ADMIN_PASSWORD from root .env")
ok('throw new Error("Playwright requires the existing admin credentials' in playwright_config and '|| "Admin@123"' not in playwright_config,"Playwright fails closed instead of silently using a different fallback admin password")
ok('Read-DotEnv' in release and "Join-Path $Root '.env'" in release and '$env:E2E_ADMIN_EMAIL = $resolvedAdminEmail' in release and '$env:E2E_ADMIN_PASSWORD = $resolvedAdminPassword' in release,"Stable release exports the existing root .env admin account into Browser E2E")
ok('password hidden; reused from existing environment' in release,"Stable release identifies the reused admin account without printing its password")
ok('placeholder="Email"' in login_page and 'placeholder="Email"' in register_page,"Login/register keep the stable Email placeholder expected by the full historical Playwright suite")

# Stable release automation must run Browser E2E before any GitHub publication.
release_workflow=text(".github/workflows/v77-auto-release.yml")
ok('Browser E2E release gate: FULL e2e suite' in release and 'npx playwright test --project=chromium' in release,"Stable release runs the full Playwright E2E suite before publication")
ok('PLAYWRIGHT_BASE_URL' in release and 'PLAYWRIGHT_BROWSER_CHANNEL' in release and 'msedge' in release,"Stable release defaults Browser E2E to local HTTPS and Microsoft Edge")
ok(release.index('Browser E2E release gate') < release.index('Push main to GitHub'),"Browser E2E gate executes before git push")
ok('gh run watch $runId --exit-status' in release and 'Stable tag/release were NOT created' in release,"Stable release waits for exact-commit CI before tagging")
genericStableTrigger = "'v*.*.*'" in release_workflow or "'v77.*.*'" in release_workflow
ok("tags:" in release_workflow and genericStableTrigger and 'permissions:' in release_workflow and 'contents: write' in release_workflow,"GitHub tag workflow has write permission and stable-tag trigger")
ok('git archive --format=zip' in release_workflow and 'sha256sum' in release_workflow,"GitHub release workflow builds clean Full Source ZIP and SHA-256")
ok('gh release create' in release_workflow and '--generate-notes' in release_workflow and '--latest' in release_workflow,"GitHub release workflow automatically creates the Latest stable release")
ok('release-v77-0-14:' in make and 'scripts/release.ps1 v77.0.14' in make,"Makefile exposes the one-command V77.0.14 stable release target")
ok('Full local E2E gate + automatic GitHub stable release' in readme,"README documents the full E2E -> push -> CI -> tag -> auto-release flow")

# V77.0.14 layout/runtime hardening follow-up
maintenance = (ROOT / "frontend/app/admin/maintenance/page.tsx").read_text(encoding="utf-8")
v57 = (ROOT / "frontend/app/admin/booking-seat-intelligence/page.tsx").read_text(encoding="utf-8")
v62 = (ROOT / "frontend/app/admin/pricing/page.tsx").read_text(encoding="utf-8")
v23 = (ROOT / "frontend/app/admin/attendance/page.tsx").read_text(encoding="utf-8")
v43 = (ROOT / "frontend/app/staff/operations/page.tsx").read_text(encoding="utf-8")
v48 = (ROOT / "frontend/app/admin/inventory/page.tsx").read_text(encoding="utf-8")
v69 = (ROOT / "frontend/app/admin/disaster-recovery/page.tsx").read_text(encoding="utf-8")
v48_e2e = (ROOT / "frontend/e2e/inventory-operations-v48.spec.ts").read_text(encoding="utf-8")
cleanup48 = (ROOT / "tools/cleanup_v48_e2e_cinema_noise.ps1").read_text(encoding="utf-8")
showtime_specs = "\n".join((ROOT / f).read_text(encoding="utf-8") for f in ["frontend/e2e/maintenance-blackout.spec.ts","frontend/e2e/showtime-planner.spec.ts","frontend/e2e/showtime-smart-planner-v49.spec.ts"])
ok('data-testid="maintenance-selected-cinema-name"' in maintenance and 'input min-w-64' not in maintenance, "V44 maintenance selector shows the full selected cinema name without opening the dropdown")
ok('maintenance-asset-cards' in maintenance and 'hidden 2xl:block' in maintenance, "V44 equipment catalog uses responsive cards before wide desktop table layout")
ok('lg:grid-cols-4' in maintenance, "V44 maintenance KPIs distribute cleanly across common desktop widths")
ok('hidden lg:block' in v57 and 'lg:hidden' in v57, "V57 showtimes use compact desktop table plus mobile/tablet cards")
ok('Đặt vé / hiệu lực' in v57 and 'colSpan={7}' in v57, "V57 combines booking/active counts into the compact table layout")
seat_map = (ROOT / "frontend/app/booking/[showtimeId]/page.tsx").read_text(encoding="utf-8")
ok(('data-seat-status={seat.status}' in seat_map or 'data-seat-status={s.status}' in seat_map) and ('data-seat-code={seat.code}' in seat_map or 'data-seat-code={s.code}' in seat_map), "Seat-map exposes machine-readable seat state independently of localized title text")
ok('2xl:grid-cols-[420px_minmax(0,1fr)]' in v62 and 'grid-cols-4 gap-2 sm:grid-cols-7' in v62, "V62 editor and weekday controls reflow before content becomes cramped")
ok('2xl:grid-cols-[420px_minmax(0,1fr)]' in v62 and 'sm:grid-cols-2 xl:grid-cols-4' in v62, "V62 avoids squeezing editor and simulation until very wide screens")
ok('lg:grid-cols-[minmax(220px,1fr)_minmax(260px,1fr)_minmax(220px,auto)]' in v23, "V23 attendance filters use a balanced responsive toolbar")
ok('sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5' in v23 and 'xl:grid-cols-2 2xl:grid-cols-3' in v23, "V23 KPIs and timesheets reflow vertically before content becomes cramped")
ok('staff-operations-cinema-selector-v43' in v43 and 'Chọn rạp để theo dõi dữ liệu vận hành trực tiếp.' in v43, "V43 tracked-cinema control has dedicated spacing/helper text")
ok('inventory-history-scope-toggle' in v48 and '"/admin/inventory/movements"' in v48 and 'Chỉ rạp hiện tại' in v48, "V48 all-branches history really removes the cinema filter and can toggle back")
ok('min-w-[1080px]' not in v48 and 'xl:hidden' in v48, "V48 inventory history no longer requires horizontal scrolling on normal screens")
ok('CineHub Bình Thạnh ${Date.now()}' not in v48_e2e and ('const branchName="CineHub Bình Thạnh"' in v48_e2e or ('requiredBranches=[' in v48_e2e and 'name:"CineHub Bình Thạnh"' in v48_e2e)), "V48 E2E no longer creates timestamp-suffixed cinema names")
ok("!~ '[^0-9]'" in cleanup48 and '{10,' not in cleanup48, "V48 cleanup helper identifies numeric timestamp suffixes without PostgreSQL bounded-regex incompatibility")
ok('down -v' not in cleanup48.lower() and 'docker compose down' not in cleanup48.lower(), "V48 cleanup remains targeted and never resets the database volume")
ok('ON_ERROR_STOP=1' in cleanup48 and 'throw "V48 cinema cleanup failed' in cleanup48, "V48 cleanup fails closed when PostgreSQL returns an error")
ok('V69 · SAO LƯU & PHỤC HỒI SAU THẢM HỌA 5.0' in v69 and 'Sao lưu & phục hồi sau thảm họa' in v69, "V69 presentation naming is normalized")
ok('Thành côngful drills' not in v69 and 'Archive dữ liệu gửi đến' not in v69 and 'Giữ chân khách hàng</th>' not in v69, "V69 malformed backup/drill labels are corrected")
support_page = (ROOT / "frontend/app/support/page.tsx").read_text(encoding="utf-8")
security_page = (ROOT / "frontend/app/admin/security/page.tsx").read_text(encoding="utf-8")
ok('setCases(prev=>prev.some(item=>item.id===c.id)?prev:[c,...prev])' in support_page and 'await refresh(c)' in support_page, "V45 support creation renders the newly created case immediately")
ok('await load();' in security_page and 'setStatus({enabled:true,active:true,expiresAt:grant.expiresAt' in security_page and security_page.index('await load();', security_page.index('const grant=')) < security_page.index('setStatus({enabled:true,active:true,expiresAt:grant.expiresAt', security_page.index('const grant=')), "V68 step-up grant is not overwritten by an immediate status reload race")
notification_e2e = (ROOT / "frontend/e2e/notification-engagement.spec.ts").read_text(encoding="utf-8")
ok(('🏆 Khách hàng thân thiết & thành viên' in notification_e2e or '🏆 Điểm & thành viên' in notification_e2e) and '💺 Danh sách chờ' in notification_e2e, "V41 E2E follows current Vietnamese notification labels")
legacy_booking_e2e = "\n".join((ROOT / f).read_text(encoding="utf-8") for f in ["frontend/e2e/booking-flow.spec.ts","frontend/e2e/refund-automation.spec.ts","frontend/e2e/ticket-transfer.spec.ts","frontend/e2e/financial-ledger.spec.ts","frontend/e2e/payment-operations-v47.spec.ts"] )
ok('data-seat-status="AVAILABLE"' in legacy_booking_e2e and 'title*="AVAILABLE"' not in legacy_booking_e2e, "Legacy booking E2E selects seats by machine status instead of localized title text")
safe_showtime_selection = (
    ('option.getAttribute("value")' in showtime_specs)
    or ('selectOption({ index: 1 })' in showtime_specs)
    or ('selectOption({index:1})' in showtime_specs)
)
# Newer Smart-Planner cleanup legitimately uses page.evaluate() only to read the
# already-authenticated access token. The historical V77.0.14 regression was
# specifically about evaluating <option> DOM nodes and reading HTMLElement.value.
unsafe_option_evaluate = bool(re.search(r'(?:locator\(["\']option[^)]*["\']\)|\boption)\s*\.evaluate\(', showtime_specs))
ok(safe_showtime_selection and not unsafe_option_evaluate, "Showtime E2E resolves/selects options without HTMLElement.value TypeScript narrowing errors")

passed=sum(checks)
print(f"\nV77.0.14 V77.0.0-language-flow verification: {passed}/{len(checks)} checks passed")
raise SystemExit(0 if passed==len(checks) else 1)
