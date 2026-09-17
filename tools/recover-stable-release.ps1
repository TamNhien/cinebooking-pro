param(
  [Parameter(Mandatory=$true, Position=0)][string]$Version,
  [int]$TimeoutSeconds = 600
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if ($Version -notmatch '^v[0-9]+\.[0-9]+\.[0-9]+$') {
  throw "Version must be an existing immutable stable tag such as v78.0.18."
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Required command was not found: git' }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'Required command was not found: gh' }

Write-Host "=== Recover GitHub Release for immutable tag $Version ===" -ForegroundColor Cyan
& gh auth status
if ($LASTEXITCODE -ne 0) { throw 'GitHub authentication failed.' }

& git fetch origin --tags
if ($LASTEXITCODE -ne 0) { throw 'Could not fetch remote tags.' }

$remoteTag = (& git ls-remote --tags origin "refs/tags/$Version").Trim()
if ([string]::IsNullOrWhiteSpace($remoteTag)) {
  throw "Remote immutable tag $Version does not exist. This recovery tool never creates or moves tags."
}

$existing = & gh release view $Version --json url,tagName,isDraft,isPrerelease,assets 2>$null
if ($LASTEXITCODE -eq 0 -and $existing) {
  $release = $existing | ConvertFrom-Json
  if ($release.tagName -eq $Version -and -not $release.isDraft -and -not $release.isPrerelease) {
    Write-Host "Release already exists: $($release.url)" -ForegroundColor Green
    exit 0
  }
}

Write-Host 'Dispatching stable release workflow against the existing immutable tag. The workflow checks out the tag, not main.' -ForegroundColor DarkCyan
& gh workflow run v77-auto-release.yml -f "tag=$Version"
if ($LASTEXITCODE -ne 0) {
  throw 'Could not dispatch v77-auto-release.yml. Push the workflow-recovery source patch to main first.'
}

$deadline = (Get-Date).AddSeconds([Math]::Max(60, $TimeoutSeconds))
$releaseUrl = $null
while ((Get-Date) -lt $deadline -and -not $releaseUrl) {
  Start-Sleep -Seconds 4
  $json = & gh release view $Version --json url,tagName,isDraft,isPrerelease,assets 2>$null
  if ($LASTEXITCODE -eq 0 -and $json) {
    $release = $json | ConvertFrom-Json
    if ($release.tagName -eq $Version -and -not $release.isDraft -and -not $release.isPrerelease) {
      $assetNames = @($release.assets | ForEach-Object { $_.name })
      $versionNoV = $Version.Substring(1)
      $expectedZip = "cinebooking-pro-$versionNoV-full-source.zip"
      $expectedSha = "cinebooking-pro-$versionNoV-full-source.sha256.txt"
      if (($assetNames -contains $expectedZip) -and ($assetNames -contains $expectedSha)) {
        $releaseUrl = $release.url
      }
    }
  }
}

if (-not $releaseUrl) {
  Write-Host 'Recent stable-release workflow runs:' -ForegroundColor Yellow
  & gh run list --workflow v77-auto-release.yml --limit 5 | Out-Host
  throw "GitHub Release recovery did not complete for $Version within $TimeoutSeconds seconds."
}

Write-Host "PASS: immutable tag $Version now has a published GitHub Release with canonical Full Source + SHA-256 assets." -ForegroundColor Green
Write-Host "Release: $releaseUrl" -ForegroundColor Green
