param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Template = Join-Path $Root ".env.example"
$Target = Join-Path $Root ".env"

if (-not (Test-Path $Template)) {
  throw ".env.example not found at $Template"
}

if ((Test-Path $Target) -and -not $Force) {
  throw ".env already exists. Use -Force only if you intentionally want to replace it."
}

$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try {
  $rng.GetBytes($bytes)
} finally {
  $rng.Dispose()
}
$secret = [Convert]::ToBase64String($bytes)

$content = [System.IO.File]::ReadAllText($Template)
$content = [System.Text.RegularExpressions.Regex]::Replace(
  $content,
  '(?m)^JWT_SECRET=.*$',
  "JWT_SECRET=$secret"
)

# UTF-8 without BOM keeps Docker Compose parsing predictable across platforms.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($Target, $content, $utf8NoBom)

Write-Host "Created $Target" -ForegroundColor Green
Write-Host "JWT_SECRET generated with 32 cryptographically random bytes (Base64 encoded)." -ForegroundColor Green
Write-Host "Next: change ADMIN_PASSWORD before any non-local deployment." -ForegroundColor Yellow
