# Local HTTPS certificates

Do not commit local TLS private keys or certificates.

Generate a trusted localhost certificate on Windows with:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\setup-local-https.ps1 -InstallMkcert -Start
```

The script creates these ignored files:

- `localhost.pem`
- `localhost-key.pem`

The certificate is trusted only on the machine where `mkcert -install` was run.
