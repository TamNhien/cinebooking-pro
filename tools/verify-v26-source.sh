#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

checks=0
pass(){ printf 'PASS: %s\n' "$1"; checks=$((checks+1)); }

test -f frontend/app/offline/page.tsx && pass "offline fallback page"
test -f frontend/app/offline-tickets/page.tsx && pass "offline ticket vault page"
test -f frontend/lib/offlineTickets.ts && pass "IndexedDB ticket storage"
sw_version="$(grep -Eo 'const VERSION = "v[0-9]+"' frontend/public/sw.js | head -1 | grep -Eo '[0-9]+' || true)"
if [[ -n "$sw_version" ]] && (( sw_version >= 26 )); then
  pass "service worker cache version"
fi
grep -q 'url.pathname.startsWith("/api/")' frontend/public/sw.js && pass "authenticated API responses excluded from cache"
grep -q 'SKIP_WAITING' frontend/public/sw.js && pass "service worker update flow"
grep -q 'Lưu vé offline' frontend/app/ticket/'[bookingId]'/page.tsx && pass "explicit offline ticket opt-in"
grep -q 'requestPersistentStorage' frontend/app/ticket/'[bookingId]'/page.tsx && pass "persistent storage request"
grep -q 'capture="environment"' frontend/app/staff/check-in/page.tsx && pass "rear camera capture hint"
grep -q 'icon-maskable-512.png' frontend/public/manifest.webmanifest && pass "maskable install icon"
grep -q 'beforeinstallprompt' frontend/components/PwaManager.tsx && pass "install prompt UX"
grep -q 'controllerchange' frontend/components/PwaManager.tsx && pass "PWA update reload UX"
test -s frontend/public/icon-192.png && test -s frontend/public/icon-512.png && test -s frontend/public/icon-maskable-512.png && pass "PNG install icons"
grep -q 'V26 has no schema migration' README.md && pass "database compatibility documented"

echo "$checks/14 checks passed"
test "$checks" -eq 14
