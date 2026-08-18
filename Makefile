.PHONY: up down logs recreate backup diagnose-v27 test-v27 diagnose-v28 verify-v28 diagnose-v29 verify-v29 verify-v29.2 verify-v29.3 diagnose-v30 verify-v30 verify-v30-1 verify-v30-2 diagnose-v31 verify-v31 verify-v31-2 diagnose-v32 verify-v32 e2e-v29.2 reset

up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

recreate:
	docker compose down
	docker compose up --build -d

backup:
	powershell -ExecutionPolicy Bypass -File .\tools\backup-db.ps1

diagnose-v27:
	powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v27.ps1

test-v27:
	powershell -ExecutionPolicy Bypass -File .\tools\test-v27.ps1

diagnose-v28:
	powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v28.ps1

verify-v28:
	python tools/verify_v28_ci.py

diagnose-v29:
	powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v29.ps1

verify-v29:
	python tools/verify_v29_release_candidate.py

verify-v29.2:
	python tools/verify_v29_2_playwright_e2e.py

verify-v29.3:
	python tools/verify_v29_3_demo_schedule.py

diagnose-v30:
	powershell -ExecutionPolicy Bypass -File .\tools\diagnose-v30.ps1

verify-v30:
	python tools/verify_v30_discovery_showtimes.py

e2e-v29.2:
	bash tools/e2e-v29.2.sh

reset:
	@echo "V27 SAFETY: destructive volume reset is disabled. Do NOT use docker compose down -v for normal updates."
	@exit 1

verify-v30-1:
	python tools/verify_v30_1_frontend_toolchain.py

diagnose-v30-1:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v30.ps1

verify-v30-2:
	python tools/verify_v30_2_playwright_pin_policy.py


verify-v31:
	python tools/verify_v31_ticket_wallet.py

diagnose-v31:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v31.ps1

verify-v31-1:
	python tools/verify_v31_1_lint_purity.py

verify-v31-2:
	python tools/verify_v31_2_rc_determinism.py

verify-v32:
	python tools/verify_v32_waitlist.py

diagnose-v32:
	powershell -ExecutionPolicy Bypass -File ./tools/diagnose-v32.ps1
