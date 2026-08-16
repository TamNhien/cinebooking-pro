from pathlib import Path
root=Path(__file__).resolve().parents[1]
checks={
    'migration': (root/'backend/src/main/resources/db/migration/V21__security_sessions.sql','CREATE TABLE auth_session'),
    'refresh hash': (root/'backend/src/main/java/com/cinebooking/auth/AuthSessionService.java','setRefreshTokenHash(hash(rotated))'),
    'httpOnly cookie': (root/'backend/src/main/java/com/cinebooking/auth/AuthSessionService.java','.httpOnly(true)'),
    'access sid': (root/'backend/src/main/java/com/cinebooking/auth/JwtService.java','payloadMap.put("sid"'),
    'access revocation': (root/'backend/src/main/java/com/cinebooking/auth/JwtAuthenticationFilter.java','accessSessionActive'),
    'refresh endpoint': (root/'backend/src/main/java/com/cinebooking/auth/AuthController.java','@PostMapping("/refresh")'),
    'session API': (root/'backend/src/main/java/com/cinebooking/auth/SecuritySessionController.java','/api/me/security'),
    'admin revoke API': (root/'backend/src/main/java/com/cinebooking/auth/AdminSecurityController.java','/api/admin/security'),
    'password reset revoke': (root/'backend/src/main/java/com/cinebooking/auth/PasswordResetService.java','"PASSWORD_RESET"'),
    'staff disable revoke': (root/'backend/src/main/java/com/cinebooking/user/AdminStaffService.java','"ACCOUNT_DISABLED"'),
    'frontend auto refresh': (root/'frontend/lib/api.ts','refreshAccessToken'),
    'profile sessions UI': (root/'frontend/app/profile/page.tsx','Bảo mật & thiết bị'),
    'nginx headers': (root/'infra/nginx/nginx.conf','X-Content-Type-Options'),
    'smoke test': (root/'tools/test-v21.ps1','ALL V21 SECURITY & SESSION SMOKE TESTS PASSED'),
}
failed=[]
for name,(path,needle) in checks.items():
    ok=path.exists() and needle in path.read_text(encoding='utf-8')
    print(('PASS' if ok else 'FAIL')+': '+name)
    if not ok: failed.append(name)
print(f'{len(checks)-len(failed)}/{len(checks)} checks passed')
raise SystemExit(1 if failed else 0)
