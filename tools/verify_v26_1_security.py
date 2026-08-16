from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
checks = []

def check(name, ok):
    checks.append((name, bool(ok)))
    print(("PASS" if ok else "FAIL") + f": {name}")

compose = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
app_yml = (ROOT / "backend/src/main/resources/application.yml").read_text(encoding="utf-8")
jwt = (ROOT / "backend/src/main/java/com/cinebooking/auth/JwtService.java").read_text(encoding="utf-8")
init_ps1 = (ROOT / "tools/init-env.ps1").read_text(encoding="utf-8")
env_example = (ROOT / ".env.example").read_text(encoding="utf-8")

check("Compose requires JWT_SECRET", '${JWT_SECRET:?' in compose)
check("Compose has no JWT fallback secret", 'JWT_SECRET:-change-this' not in compose)
check("Spring config requires JWT_SECRET", 'secret: ${JWT_SECRET}' in app_yml)
check("Spring config has no JWT fallback secret", 'JWT_SECRET:change-this' not in app_yml)
check("JWT service rejects blank secret", 'secret == null || secret.isBlank()' in jwt)
check("JWT service rejects example secret", 'must not use the example/default value' in jwt)
check("JWT service enforces 32-byte minimum", 'JWT_SECRET must be at least 32 bytes' in jwt)
check("PowerShell generator uses cryptographic RNG", 'RandomNumberGenerator]::Create()' in init_ps1 and '.GetBytes($bytes)' in init_ps1)
check("PowerShell generator creates 32 random bytes", re.search(r'New-Object byte\[\] 32', init_ps1) is not None)
check("PowerShell generator Base64-encodes secret", 'ToBase64String' in init_ps1)
check("Example env still contains non-secret placeholder", 'JWT_SECRET=change-this-to-a-long-random-secret-at-least-32-characters' in env_example)

failed = [name for name, ok in checks if not ok]
print(f"\n{len(checks) - len(failed)}/{len(checks)} checks passed")
if failed:
    raise SystemExit(1)
