from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
checks = []

def check(name, ok):
    checks.append((name, bool(ok)))
    print(("PASS" if ok else "FAIL") + f": {name}")

manifest_path = ROOT / "frontend/public/manifest.webmanifest"
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
diagnose = (ROOT / "tools/diagnose-v26.ps1").read_text(encoding="utf-8")
smoke = (ROOT / "tools/test-v26.ps1").read_text(encoding="utf-8")
layout = (ROOT / "frontend/app/layout.tsx").read_text(encoding="utf-8")

check("static manifest exists", manifest_path.is_file())
check("dynamic manifest route removed", not (ROOT / "frontend/app/manifest.ts").exists())
check("manifest display is standalone", manifest.get("display") == "standalone")
check("manifest name is CineBooking Pro", manifest.get("name") == "CineBooking Pro")
check("manifest has 192px icon", any(i.get("sizes") == "192x192" for i in manifest.get("icons", [])))
check("manifest has 512px icon", any(i.get("sizes") == "512x512" for i in manifest.get("icons", [])))
check("manifest has maskable icon", any(i.get("purpose") == "maskable" for i in manifest.get("icons", [])))
check("manifest has shortcuts", len(manifest.get("shortcuts", [])) >= 2)
check("layout links manifest", 'manifest: "/manifest.webmanifest"' in layout)
check("diagnostic handles byte responses", "$Response.Content -is [byte[]]" in diagnose)
check("diagnostic bypasses cache", "_cb=" in diagnose and "no-cache, no-store" in diagnose)
check("diagnostic prints body if display missing", "Response body:" in diagnose)
check("smoke test uses robust JSON parser", "Parse-JsonResponse" in smoke)

failed = [name for name, ok in checks if not ok]
print(f"\n{len(checks)-len(failed)}/{len(checks)} checks passed")
if failed:
    raise SystemExit(1)
