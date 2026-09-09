from pathlib import Path
import re
import sys

root = Path(__file__).resolve().parents[1]
checks = []

def check(name, ok):
    checks.append((name, bool(ok)))
    print(("PASS" if ok else "FAIL") + ": " + name)

compose = (root / "docker-compose.https.yml").read_text(encoding="utf-8")
nginx = (root / "infra/nginx/nginx.https.conf").read_text(encoding="utf-8")
setup = (root / "tools/setup-local-https.ps1").read_text(encoding="utf-8")
gitignore = (root / ".gitignore").read_text(encoding="utf-8")
security = (root / "backend/src/main/java/com/cinebooking/config/SecurityConfig.java").read_text(encoding="utf-8")
readme = (root / "README.md").read_text(encoding="utf-8")

a = root / "infra/nginx/certs/localhost.pem"
b = root / "infra/nginx/certs/localhost-key.pem"

check("HTTPS compose override exists", "docker-compose.https.yml" in str(root / "docker-compose.https.yml"))
check("HTTPS port 443 is published", re.search(r'\$\{HTTPS_PORT:-443\}:443', compose) is not None)
check("HTTPS nginx config is mounted", "nginx.https.conf:/etc/nginx/nginx.conf:ro" in compose)
check("TLS cert directory is mounted read-only", "./infra/nginx/certs:/etc/nginx/certs:ro" in compose)
check("HTTPS mode sets secure refresh cookie", 'REFRESH_COOKIE_SECURE: "true"' in compose)
check("HTTPS mode sets secure frontend origin", "FRONTEND_URL: https://localhost" in compose)
check("payment callbacks use HTTPS in local HTTPS mode", "VNPAY_RETURN_URL: https://localhost/payment/result" in compose and "MOMO_REDIRECT_URL: https://localhost/payment/result" in compose)
check("nginx listens on TLS 443", "listen 443 ssl;" in nginx)
check("nginx redirects port 80 to HTTPS", "return 308 https://$host$request_uri;" in nginx)
check("nginx loads localhost certificate", "ssl_certificate /etc/nginx/certs/localhost.pem;" in nginx)
check("nginx loads localhost private key", "ssl_certificate_key /etc/nginx/certs/localhost-key.pem;" in nginx)
check("nginx forwards HTTPS scheme", "proxy_set_header X-Forwarded-Proto https;" in nginx)
check("nginx websocket upgrade remains enabled", 'proxy_set_header Upgrade $http_upgrade;' in nginx and 'proxy_set_header Connection "upgrade";' in nginx)
check("setup script installs trusted local CA", "& $mkcert -install" in setup)
check("setup script generates localhost cert and key", '-cert-file $CertFile -key-file $KeyFile "localhost" "127.0.0.1" "::1"' in setup)
check("setup script validates compose override", "compose -f $BaseCompose -f $HttpsCompose config" in setup)
check("setup script can start HTTPS stack", "compose -f $BaseCompose -f $HttpsCompose up -d --build" in setup)
check("local cert PEM files are gitignored", "infra/nginx/certs/*.pem" in gitignore)
check("backend CORS permits HTTPS localhost", '"https://localhost"' in security)
check("README documents trusted local HTTPS", "Trusted local HTTPS hotfix" in readme)
check("no generated localhost certificate is shipped", not a.exists())
check("no generated localhost private key is shipped", not b.exists())

passed = sum(ok for _, ok in checks)
print(f"\n{passed}/{len(checks)} checks passed")
sys.exit(0 if passed == len(checks) else 1)
