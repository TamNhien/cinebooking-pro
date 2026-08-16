# V28.5 - V27 Git/local-artifact verifier fix

V28.5 fixes three false positives in the V27 source-safety regression when it runs inside a real developer checkout:

- Markdown emphasis in `Do **not** use docker compose down -v` is accepted as the same safety warning as plain text.
- A local `.env` is allowed to exist, provided Git does not track it.
- Local `backups/*.dump` and `*.dump.sha256` files are allowed to exist, provided Git does not track them.

The verifier now uses `git ls-files` when repository metadata is available. For source ZIPs without `.git`, it falls back to checking `.gitignore` rules. This keeps the leak-prevention property while allowing the runtime files required by CineBooking V27/V28 on a developer machine.

No Docker, database, Flyway, JWT, or application-runtime behavior changes in this patch.
