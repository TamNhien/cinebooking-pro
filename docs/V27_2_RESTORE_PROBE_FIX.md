# V27.2 - Windows PowerShell restore-probe fix

V27.2 fixes a false failure in `tools/test-v27.ps1` on Windows PowerShell 5.1.

The V27.1 smoke test embedded `SELECT count(*) ...` inside a nested `sh -lc` command containing shell command substitution. On some Windows PowerShell 5.1 / Docker Compose argument paths, the nested quoting was corrupted before `psql` received the SQL, producing an error similar to `count(*): syntax error`.

V27.2 writes the table-count SQL to a temporary ASCII file in the existing `./backups:/backups` bind mount. `psql` executes that file with `-f` for both the source database and the temporary restored database. PowerShell then reads the two result files and compares the integer counts. The temporary SQL/result files are removed in the `finally` block.

This patch does not rebuild containers, modify the production database, or change the backup archive format.

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\test-v27.ps1
```

Expected final line:

```text
ALL V27.2 DATABASE SAFETY TESTS PASSED
```
