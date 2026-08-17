.PHONY: up down logs recreate backup diagnose-v27 test-v27 diagnose-v28 verify-v28 diagnose-v29 verify-v29 reset

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

reset:
	@echo "V27 SAFETY: destructive volume reset is disabled. Do NOT use docker compose down -v for normal updates."
	@exit 1
