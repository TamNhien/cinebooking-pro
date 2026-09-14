[CmdletBinding()]
param(
    [switch]$SkipVerify
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path -Parent $PSScriptRoot

$obsolete = @(
    'frontend/lib/i18n-runtime.ts',
    'frontend/lib/i18n-en-supplement.ts',
    'frontend/lib/i18n-static-catalog.generated.ts'
)

Write-Host 'V77.0.14 -> V77.0.0 language-flow cleanup' -ForegroundColor Cyan
Write-Host "Repo root: $RepoRoot"

$removed = 0
foreach ($relative in $obsolete) {
    $path = Join-Path $RepoRoot $relative
    if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Force
        Write-Host "[REMOVED] $relative" -ForegroundColor Yellow
        $removed++
    } else {
        Write-Host "[OK]      $relative is already absent" -ForegroundColor DarkGray
    }
}

$left = @()
foreach ($relative in $obsolete) {
    if (Test-Path -LiteralPath (Join-Path $RepoRoot $relative)) {
        $left += $relative
    }
}
if ($left.Count -gt 0) {
    throw "Unable to remove obsolete i18n runtime files: $($left -join ', ')"
}

Write-Host "Cleanup complete. Removed $removed obsolete file(s)." -ForegroundColor Green

if (-not $SkipVerify) {
    $verify = Join-Path $PSScriptRoot 'verify_v77_0_14_navigation_language_dropdown_localization.py'
    Write-Host ''
    Write-Host 'Running V77.0.14 language-flow verifier...' -ForegroundColor Cyan
    & python -X utf8 $verify
    if ($LASTEXITCODE -ne 0) {
        throw "Verifier failed with exit code $LASTEXITCODE"
    }
}
