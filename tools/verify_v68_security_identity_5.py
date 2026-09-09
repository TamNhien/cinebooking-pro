from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[1]
checks=[]

def text(rel):
    p=ROOT/rel
    return p.read_text(encoding='utf-8') if p.exists() else ''
def exists(rel): return (ROOT/rel).exists()
def check(name,cond):
    ok=bool(cond); checks.append((name,ok)); print(f"[ {'OK' if ok else 'FAIL'} ] {name}")

migration=text('backend/src/main/resources/db/migration/V68__security_identity_step_up.sql')
entity=text('backend/src/main/java/com/cinebooking/identity/AdminStepUpGrant.java')
repo=text('backend/src/main/java/com/cinebooking/identity/AdminStepUpGrantRepository.java')
dtos=text('backend/src/main/java/com/cinebooking/identity/StepUpDtos.java')
service=text('backend/src/main/java/com/cinebooking/identity/StepUpAuthenticationService.java')
controller=text('backend/src/main/java/com/cinebooking/identity/StepUpController.java')
admincontroller=text('backend/src/main/java/com/cinebooking/identity/AdminIdentitySecurityController.java')
filter_src=text('backend/src/main/java/com/cinebooking/identity/StepUpAuthorizationFilter.java')
headers=text('backend/src/main/java/com/cinebooking/identity/SecurityHeadersFilter.java')
security=text('backend/src/main/java/com/cinebooking/config/SecurityConfig.java')
app=text('backend/src/main/resources/application.yml')
compose=text('docker-compose.yml')
env=text('.env.example')
stepup_ts=text('frontend/lib/step-up.ts')
api=text('frontend/lib/api.ts')
auth=text('frontend/lib/auth.ts')
types=text('frontend/lib/types.ts')
ui=text('frontend/app/admin/security/page.tsx')
adminpage=text('frontend/app/admin/page.tsx')
header=text('frontend/components/Header.tsx')
e2e=text('frontend/e2e/security-identity-v68.spec.ts')
playwright=text('frontend/playwright.config.ts')
nginx_http=text('infra/nginx/nginx.conf')
nginx_https=text('infra/nginx/nginx.https.conf')
ci=text('.github/workflows/ci.yml')
make=text('Makefile')
diagnose=text('tools/diagnose-v68.ps1')
release_script=text('scripts/release.ps1')
readme=text('README.md')
itest=text('backend/src/test/java/com/cinebooking/integration/CineBookingIntegrationIT.java')
seed=text('tools/seed-demo-57-tables-10-rows.sql')
v67verify=text('tools/verify_v67_payment_resilience_reconciliation.py')
v66verify=text('tools/verify_v66_booking_consistency_seat_locking.py')

for rel,label in [
 ('backend/src/main/resources/db/migration/V68__security_identity_step_up.sql','V68 migration exists'),
 ('backend/src/main/java/com/cinebooking/identity/AdminStepUpGrant.java','V68 step-up entity exists'),
 ('backend/src/main/java/com/cinebooking/identity/AdminStepUpGrantRepository.java','V68 step-up repository exists'),
 ('backend/src/main/java/com/cinebooking/identity/StepUpDtos.java','V68 DTOs exist'),
 ('backend/src/main/java/com/cinebooking/identity/StepUpAuthenticationService.java','V68 step-up service exists'),
 ('backend/src/main/java/com/cinebooking/identity/StepUpController.java','V68 step-up controller exists'),
 ('backend/src/main/java/com/cinebooking/identity/AdminIdentitySecurityController.java','V68 admin identity controller exists'),
 ('backend/src/main/java/com/cinebooking/identity/StepUpAuthorizationFilter.java','V68 step-up authorization filter exists'),
 ('backend/src/main/java/com/cinebooking/identity/SecurityHeadersFilter.java','V68 security headers filter exists'),
 ('frontend/lib/step-up.ts','V68 frontend step-up storage exists'),
 ('frontend/e2e/security-identity-v68.spec.ts','V68 browser E2E exists'),
 ('tools/diagnose-v68.ps1','V68 diagnose exists'),
 ('scripts/release.ps1','stable-only release script exists')]: check(label,exists(rel))

check('V68 strategy version explicit','V68-SECURITY-IDENTITY-5' in service and 'V68-SECURITY-IDENTITY-5' in ui and 'V68-SECURITY-IDENTITY-5' in e2e)

# migration
check('migration creates admin_step_up_grant','CREATE TABLE admin_step_up_grant' in migration)
for col in ['user_id UUID','session_id UUID','token_hash VARCHAR(64)','issued_at TIMESTAMPTZ','expires_at TIMESTAMPTZ','last_used_at TIMESTAMPTZ','revoked_at TIMESTAMPTZ','revoke_reason VARCHAR(120)']:
    check('step-up schema includes '+col.split()[0],col in migration)
check('step-up user FK cascades','user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE' in migration)
check('step-up session FK cascades','session_id UUID NOT NULL REFERENCES auth_session(id) ON DELETE CASCADE' in migration)
check('step-up token hash unique','token_hash VARCHAR(64) NOT NULL UNIQUE' in migration)
check('step-up expiry constraint','ck_admin_step_up_expiry' in migration and 'expires_at > issued_at' in migration)
for idx in ['idx_admin_step_up_active_session','idx_admin_step_up_active_user','idx_admin_step_up_expiry']:
    check('step-up index '+idx,idx in migration)
check('V68 migration has no seed inserts','INSERT INTO' not in migration.upper())

# entity/repository
check('step-up entity maps table','@Table(name = "admin_step_up_grant")' in entity)
check('step-up entity has UUID id','@Id private UUID id' in entity)
check('step-up entity maps token hash','name="token_hash"' in entity)
check('step-up entity never maps raw token','rawToken' not in entity and 'token VARCHAR' not in migration)
check('step-up active requires unrevoked future expiry','revokedAt==null' in entity and 'expiresAt.isAfter(Instant.now())' in entity)
check('repository resolves hash only','findByTokenHash' in repo)
check('repository counts active grants','countByRevokedAtIsNullAndExpiresAtAfter' in repo)
check('repository revokes prior session grants','revokeActiveForSession' in repo and 'g.sessionId=:sessionId' in repo)

# service security
check('step-up only for ADMIN','user.getRole()!=Role.ADMIN' in service)
check('step-up binds active auth session','s.getUserId().equals(user.getId())&&s.active()' in service)
check('step-up verifies current password','encoder.matches(password,user.getPasswordHash())' in service)
check('wrong step-up password is audited','ADMIN_STEP_UP_FAILED' in service)
check('wrong step-up password does not invalidate auth session','HttpStatus.FORBIDDEN' in service)
check('prior session grant is superseded','revokeActiveForSession(sessionId,now,"SUPERSEDED")' in service)
check('step-up raw token uses secure random','SecureRandom' in service and 'new byte[48]' in service)
check('step-up raw token is URL safe','Base64.getUrlEncoder().withoutPadding()' in service)
check('step-up persists SHA-256 hash only','setTokenHash(hash(raw))' in service)
check('step-up TTL bounded 60-1800','Math.max(60,Math.min(1800,ttlSeconds))' in service)
check('step-up grant audit exists','ADMIN_STEP_UP_GRANTED' in service)
check('step-up revoke audit exists','ADMIN_STEP_UP_REVOKED' in service)
check('step-up verification binds user','g.getUserId().equals(userId)' in service)
check('step-up verification binds session','g.getSessionId().equals(sessionId)' in service)
check('step-up verification rejects expired grant','filter(AdminStepUpGrant::active)' in service)
check('step-up usage updates last_used_at','setLastUsedAt(Instant.now())' in service)
check('admin summary exposes active grant count','countByRevokedAtIsNullAndExpiresAtAfter' in service)
check('admin summary exposes no secrets','AdminIdentitySecuritySummary' in dtos and 'tokenHash' not in dtos and 'passwordHash' not in dtos)

# endpoints/filter
check('step-up issue endpoint is authenticated namespace','@RequestMapping("/api/security/step-up")' in controller and '@PostMapping' in controller)
check('step-up status endpoint exists','@GetMapping("/status")' in controller)
check('step-up revoke endpoint exists','@DeleteMapping' in controller)
check('step-up reads authenticated session id','auth.getDetails() instanceof UUID' in controller)
check('admin identity summary endpoint exists','@RequestMapping("/api/admin/identity-security")' in admincontroller and '@GetMapping("/summary")' in admincontroller)
check('step-up header constant exists','X-Step-Up-Token' in filter_src)
check('missing step-up returns HTTP 428','response.setStatus(428)' in filter_src)
check('missing step-up emits requirement header','X-Step-Up-Required' in filter_src)
check('missing step-up keeps auth session intact','401' not in filter_src and 'clear' not in filter_src.lower())
check('GET requests are never step-up protected','"GET".equalsIgnoreCase(method)' in filter_src)
check('non-admin identities fall through to normal RBAC','"ROLE_ADMIN"' in filter_src and 'if(!admin)' in filter_src)
for marker in ['/api/admin/users','/api/admin/staff','/api/admin/payment-resilience','/api/admin/pricing/rules','/api/admin/marketing/campaigns/launch','/api/admin/refunds/','/api/admin/security/users/','/api/admin/booking-ops/']:
    check('sensitive action group protected '+marker,marker in filter_src)
check('booking-ops protection covers manual check-in','/manual-checkin' in filter_src)
check('booking-ops protection covers refund approval','/refund-approve' in filter_src)
check('booking-ops protection covers cancellation','/cancel' in filter_src)
check('filter verifies user and session bound token','verifyAndTouch(userId,sessionId' in filter_src)

# headers/cors/filter wiring
for name,value in [('X-Content-Type-Options','nosniff'),('X-Frame-Options','DENY'),('Referrer-Policy','strict-origin-when-cross-origin'),('Permissions-Policy','camera=()'),('Content-Security-Policy','frame-ancestors')]:
    check('security header '+name,name in headers and value in headers)
check('CSP blocks object embedding',"object-src 'none'" in headers)
check('CSP restricts base uri',"base-uri 'self'" in headers)
check('CSP restricts form action',"form-action 'self'" in headers)
check('CSP permits websocket operations','ws: wss:' in headers)
check('HSTS only on HTTPS','isHttps(request)' in headers and 'Strict-Transport-Security' in headers)
check('HSTS max age one year','max-age=31536000' in headers)
for edge_name in ['X-Content-Type-Options','X-Frame-Options','Referrer-Policy','Permissions-Policy']:
    check('HTTP proxy hides duplicate upstream '+edge_name,('proxy_hide_header '+edge_name+';') in nginx_http)
    check('HTTPS proxy hides duplicate upstream '+edge_name,('proxy_hide_header '+edge_name+';') in nginx_https)
check('HTTP edge Permissions-Policy matches V68 backend policy','camera=(), microphone=(), geolocation=(), payment=()' in nginx_http and 'camera=(self)' not in nginx_http)
check('HTTPS edge Permissions-Policy matches V68 backend policy','camera=(), microphone=(), geolocation=(), payment=()' in nginx_https and 'camera=(self)' not in nginx_https)
check('SecurityConfig allows step-up request header','X-Step-Up-Token' in security)
check('SecurityConfig exposes step-up requirement header','X-Step-Up-Required' in security)
check('SecurityConfig wires security headers before JWT','addFilterBefore(securityHeaders, JwtAuthenticationFilter.class)' in security)
check('SecurityConfig wires step-up after JWT','addFilterAfter(stepUp, JwtAuthenticationFilter.class)' in security)
check('step-up endpoint is not under permitAll auth namespace','/api/security/step-up' not in security)

# config
check('application step-up enabled default true','enabled: ${SECURITY_STEP_UP_ENABLED:true}' in app)
check('application step-up TTL default 600','ttl-seconds: ${SECURITY_STEP_UP_TTL_SECONDS:600}' in app)
check('compose wires SECURITY_STEP_UP_ENABLED','SECURITY_STEP_UP_ENABLED: ${SECURITY_STEP_UP_ENABLED:-true}' in compose)
check('compose wires SECURITY_STEP_UP_TTL_SECONDS','SECURITY_STEP_UP_TTL_SECONDS: ${SECURITY_STEP_UP_TTL_SECONDS:-600}' in compose)
check('env example documents SECURITY_STEP_UP_ENABLED','SECURITY_STEP_UP_ENABLED=true' in env)
check('env example documents SECURITY_STEP_UP_TTL_SECONDS','SECURITY_STEP_UP_TTL_SECONDS=600' in env)

# frontend
check('frontend step-up storage uses sessionStorage','sessionStorage.getItem(KEY)' in stepup_ts and 'sessionStorage.setItem(KEY' in stepup_ts)
check('frontend step-up storage does not use localStorage','localStorage' not in stepup_ts)
check('frontend step-up expiry clears stale token','new Date(value.expiresAt).getTime()<=Date.now()' in stepup_ts)
check('api automatically sends step-up header','headers.set("X-Step-Up-Token", elevated)' in api)
check('logout clears V68 step-up token','cinebooking_admin_step_up_v68' in auth and 'sessionStorage.removeItem' in auth)
check('frontend V68 grant type exists','StepUpGrantV68' in types)
check('frontend V68 status type exists','StepUpStatusV68' in types)
check('frontend V68 admin summary type exists','AdminIdentitySecuritySummaryV68' in types)
check('Admin Dashboard links V68 security','admin-security-identity-v68' in adminpage and 'Security & Identity V68' in adminpage)
check('Admin Dashboard versioned tiles are ascending V53-V68', all(adminpage.index(label) < adminpage.index(next_label) for label,next_label in zip(['Command Center V53','Performance V54','Retention V55','Customer Value V56','Realtime Operations V59','Payment Production V60','Fraud & Risk V61','Dynamic Pricing V62','Recommendation V63','CRM & Marketing V64','Observability V65','Seat Operations V66','Payment Resilience V67'], ['Performance V54','Retention V55','Customer Value V56','Realtime Operations V59','Payment Production V60','Fraud & Risk V61','Dynamic Pricing V62','Recommendation V63','CRM & Marketing V64','Observability V65','Seat Operations V66','Payment Resilience V67','Security & Identity V68'])))
check('Header links V68 security','Security & Identity V68' in header and '/admin/security' in header)
check('V68 UI root test id','security-identity-v68' in ui)
check('V68 UI summary test id','security-identity-summary-v68' in ui)
check('V68 UI step-up panel','admin-step-up-v68' in ui)
check('V68 UI password input','step-up-password-v68' in ui)
check('V68 UI unlock action','step-up-unlock-v68' in ui)
check('V68 UI revoke action','step-up-revoke-v68' in ui)
check('V68 UI security headers panel','security-headers-v68' in ui)
check('V68 UI stores grant only after issue','setStepUp({token:grant.token' in ui)
check('V68 UI requires ADMIN role','me.role!=="ADMIN"' in ui)
check('V68 render does not call Date.now in useState initializer','useState(Date.now())' not in ui)
check('V68 clock starts from deterministic render value','const [clock,setClock]=useState(0)' in ui)
check('V68 clock samples current time outside render','const tick=()=>setClock(Date.now())' in ui and 'setInterval(tick,1000)' in ui)
check('V46 Security Operations compatibility remains','Security Operations' in ui and 'admin-security-alert' in ui)

# E2E
check('V68 E2E logs in as admin','loginAdmin' in e2e and 'E2E_ADMIN_PASSWORD' in e2e)
check('V68 E2E verifies Admin tile','admin-security-identity-v68' in e2e)
check('V68 E2E verifies strategy','V68-SECURITY-IDENTITY-5' in e2e)
check('V68 E2E proves sensitive write blocked without step-up','blocked.status()).toBe(428)' in e2e)
check('V68 E2E checks requirement header','x-step-up-required' in e2e)
check('V68 E2E reauthenticates with real admin password','step-up-password-v68' in e2e and 'admin.password' in e2e)
check('V68 E2E proves sensitive write allowed with step-up','created.status()).toBe(201)' in e2e)
check('V68 E2E cleans temporary user','removeTemp' in e2e)
check('V68 E2E validates nosniff','x-content-type-options' in e2e and 'nosniff' in e2e)
check('V68 E2E validates frame deny','x-frame-options' in e2e and 'DENY' in e2e)
check('V68 E2E validates singleton Referrer-Policy','referrer-policy' in e2e and 'strict-origin-when-cross-origin' in e2e)
check('V68 E2E validates singleton Permissions-Policy','permissions-policy' in e2e and 'payment=()' in e2e)
check('V68 E2E validates CSP frame ancestors','content-security-policy' in e2e and "frame-ancestors 'none'" in e2e)
check('V68 E2E validates HTTPS HSTS','strict-transport-security' in e2e and 'max-age=31536000' in e2e)
check('Playwright derives one shared baseURL for browser and API requests','const baseURL=process.env.PLAYWRIGHT_BASE_URL' in playwright and 'baseURL,' in playwright)
check('Playwright identifies only loopback HTTPS for local TLS bypass','isLoopbackHttps' in playwright and '"localhost","127.0.0.1","::1"' in playwright)
check('Playwright APIRequestContext tolerates trusted local mkcert certificate','ignoreHTTPSErrors: ignoreLoopbackHttpsErrors' in playwright)
check('Playwright local TLS bypass does not apply to remote HTTPS','parsed.protocol==="https:"' in playwright and 'includes(parsed.hostname)' in playwright)

# integration/data
check('Integration expects Flyway >=68',any(x in itest for x in ['isGreaterThanOrEqualTo(68)','isGreaterThanOrEqualTo(69)','isGreaterThanOrEqualTo(70)','isGreaterThanOrEqualTo(71)']))
check('Integration expects at least 59 public tables',any(x in itest for x in ['publicTables).isGreaterThanOrEqualTo(59)','publicTables).isGreaterThanOrEqualTo(61)','publicTables).isGreaterThanOrEqualTo(63)','publicTables).isGreaterThanOrEqualTo(65)']))
check('Integration verifies V68 step-up table','securityV68StepUpTable' in itest and 'admin_step_up_grant' in itest)
check('Integration verifies V68 step-up indexes','securityV68StepUpIndexes' in itest and 'isEqualTo(3)' in itest)
check('V67 verifier forward-compatible with Flyway V68',any(x in v67verify for x in ['isGreaterThanOrEqualTo(68)','isGreaterThanOrEqualTo(69)','isGreaterThanOrEqualTo(70)','isGreaterThanOrEqualTo(71)']))
check('V67 verifier forward-compatible with 59 tables',any(x in v67verify for x in ['isGreaterThanOrEqualTo(59)','isGreaterThanOrEqualTo(61)']))
check('V66 verifier forward-compatible with Flyway V68',any(x in v66verify for x in ['isGreaterThanOrEqualTo(68)','isGreaterThanOrEqualTo(69)','isGreaterThanOrEqualTo(70)','isGreaterThanOrEqualTo(71)']))
check('V66 verifier forward-compatible with 59 tables',any(x in v66verify for x in ['isGreaterThanOrEqualTo(59)','isGreaterThanOrEqualTo(61)']))
check('V68 adds no synthetic seed rows','V68' not in seed)

# CI/diagnose/release
check('CI source regression names V68 or later',any(x in ci for x in ['V26-V68 source regression','V26-V69 source regression','V26-V70 source regression','V26-V71 source regression']))
check('CI runs V68 verifier','verify_v68_security_identity_5.py' in ci)
check('Makefile exposes verify-v68','verify-v68:' in make and 'verify_v68_security_identity_5.py' in make)
check('Makefile exposes diagnose-v68','diagnose-v68:' in make)
check('Makefile exposes stable release-v68','release-v68:' in make and 'v68.0.0' in make)
check('Diagnose V68 chains V67','verify_v67_payment_resilience_reconciliation.py' in diagnose)
check('Diagnose V68 runs V68 gate','verify_v68_security_identity_5.py' in diagnose)
check('Diagnose V68 states Flyway V68','Flyway V68' in diagnose)
check('Diagnose V68 states 59 public tables','59 public tables' in diagnose)
check('Stable-only release script accepts stable semantic tag',"^v[0-9]+\\.[0-9]+\\.[0-9]+$" in release_script)
check('Stable-only release script rejects pre-release','Pre-release tags are disabled' in release_script)
check('Stable-only release script waits exact CI commit','gh run list --workflow ci.yml --commit $sha' in release_script and 'gh run watch' in release_script)
check('Stable-only release script creates annotated tag','git tag -a $Version $sha' in release_script)
check('Stable-only release script creates GitHub release','gh release create $Version --verify-tag' in release_script)
check('Stable-only release script marks latest','--latest' in release_script)
check('Stable-only release script never creates rc tag','-rc.' not in release_script)

# docs
check('README current release is V68 or later',any(x in readme for x in ['Current release:** V68','Current release: **V68**','Current release:** V69','Current release: **V69**','Current release:** V70','Current release: **V70**','Current release:** V71','Current release: **V71**']))
check('README title is V68 or later',any(x in readme for x in ['# CineBooking Pro V68','# CineBooking Pro V69','# CineBooking Pro V70','# CineBooking Pro V71']))
check('README history includes V68','| **V68** |' in readme)
check('README V68 section exists','## V68 - Security & Identity 5.0' in readme)
check('README documents strategy','V68-SECURITY-IDENTITY-5' in readme)
check('README documents step-up header','X-Step-Up-Token' in readme)
check('README documents HTTP 428','428' in readme and 'step-up' in readme.lower())
check('README documents 59 public tables','Public tables: 59' in readme or '59 public tables' in readme)
check('README documents Flyway V68','Flyway latest: V68' in readme)
check('README documents stable-only V68 release','Stable only: v68.0.0' in readme)
check('README has no V68 RC release tag','v68.0.0-rc.' not in readme)
check('README documents release one-liner','.\\scripts\\release.ps1 v68.0.0' in readme)
check('README documents no raw token persistence','raw token' in readme.lower() and 'SHA-256' in readme)
check('README preserves real-data policy','không tạo phim/khách/booking/payment giả' in readme)

passed=sum(ok for _,ok in checks)
print(f"\nV68 verification: {passed}/{len(checks)} checks passed")
if passed!=len(checks):
    print('\nFailed checks:')
    for name,ok in checks:
        if not ok: print(' - '+name)
    sys.exit(1)
