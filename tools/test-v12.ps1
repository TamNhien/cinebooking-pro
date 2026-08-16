param(
  [string]$BaseUrl = "http://localhost/api",
  [string]$AdminEmail = "",
  [string]$AdminPassword = ""
)

$ErrorActionPreference = "Stop"

function To-Json($Object) { return ($Object | ConvertTo-Json -Depth 12 -Compress) }
function Headers([string]$Token) { return @{ Authorization = "Bearer $Token" } }
function Pass([string]$Message) { Write-Host "PASS: $Message" -ForegroundColor Green }
function Warn([string]$Message) { Write-Host "WARN: $Message" -ForegroundColor Yellow }

function Read-DotEnv([string]$Path) {
  $Result = @{}
  if (-not (Test-Path $Path)) { return $Result }
  foreach ($Line in Get-Content $Path) {
    $Trimmed = $Line.Trim()
    if (-not $Trimmed -or $Trimmed.StartsWith('#')) { continue }
    $Index = $Trimmed.IndexOf('=')
    if ($Index -le 0) { continue }
    $Key = $Trimmed.Substring(0, $Index).Trim()
    $Value = $Trimmed.Substring($Index + 1).Trim()
    if (($Value.StartsWith('"') -and $Value.EndsWith('"')) -or ($Value.StartsWith("'") -and $Value.EndsWith("'"))) {
      $Value = $Value.Substring(1, $Value.Length - 2)
    }
    $Result[$Key] = $Value
  }
  return $Result
}

function SecureString-ToPlainText([Security.SecureString]$SecureString) {
  $Bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr) }
}

function Get-StatusCode($ErrorRecord) {
  try { return [int]$ErrorRecord.Exception.Response.StatusCode }
  catch { return $null }
}

Write-Host "CineBooking V12 voucher + staff delete smoke test" -ForegroundColor Cyan

$EnvFile = Read-DotEnv (Join-Path (Get-Location) '.env')
if ([string]::IsNullOrWhiteSpace($AdminEmail)) {
  if ($EnvFile.ContainsKey('ADMIN_EMAIL') -and $EnvFile['ADMIN_EMAIL']) { $AdminEmail = $EnvFile['ADMIN_EMAIL'] }
  else { $AdminEmail = 'admin@cine.local' }
}

try {
  $Movies = @(Invoke-RestMethod -Method Get -Uri "$BaseUrl/movies")
  Pass "Public API reachable; movies=$($Movies.Count)"
}
catch { throw "Cannot reach $BaseUrl/movies. Check nginx/backend first." }

$Admin = $null
for ($Attempt = 1; $Attempt -le 3 -and $null -eq $Admin; $Attempt++) {
  if ([string]::IsNullOrWhiteSpace($AdminPassword)) {
    $Secure = Read-Host "Enter CURRENT password for $AdminEmail (hidden)" -AsSecureString
    $Plain = SecureString-ToPlainText $Secure
  }
  else { $Plain = $AdminPassword }
  try {
    $Admin = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body (To-Json @{ email=$AdminEmail; password=$Plain })
  }
  catch {
    if ((Get-StatusCode $_) -eq 429) { throw "Admin login is rate-limited. Wait and retry." }
    Warn "Admin login failed (attempt $Attempt of 3)."
    $Admin = $null
    $AdminPassword = ""
  }
  finally { $Plain = $null }
}
if ($null -eq $Admin) { throw "Admin login failed." }
if ($Admin.role -ne 'ADMIN') { throw "Expected ADMIN role, got $($Admin.role)." }
$H = Headers $Admin.accessToken
Pass "Admin login"

# PowerShell 5.1 may keep a JSON array returned by Invoke-RestMethod as one Object[] value.
# Do NOT wrap it with @(...), otherwise cinemaId can accidentally become an array.
$CinemasResponse = Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/cinemas" -Headers $H
$Cinema = $CinemasResponse | Select-Object -First 1
if ($null -eq $Cinema) { throw "No cinema exists. Create one before running V12 smoke test." }
$CinemaIdText = [string]$Cinema.id
$ParsedCinemaId = [Guid]::Empty
if ([string]::IsNullOrWhiteSpace($CinemaIdText) -or -not [Guid]::TryParse($CinemaIdText, [ref]$ParsedCinemaId)) {
  throw "Admin cinema API did not yield one scalar UUID. Raw cinemaId='$CinemaIdText'."
}
Pass "Cinema available: $($Cinema.name) [$CinemaIdText]"

$Stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$VoucherCode = "V12T" + $Stamp.ToString().Substring([Math]::Max(0,$Stamp.ToString().Length-8))
$VoucherBody = @{
  code=$VoucherCode
  name="V12 automated voucher test"
  discountType="PERCENT"
  discountValue=10
  minOrderAmount=100000
  maxDiscount=50000
  startsAt=$null
  endsAt=(Get-Date).AddDays(1).ToUniversalTime().ToString("o")
  usageLimit=5
  active=$true
}
$Voucher = Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/commerce/vouchers" -Headers $H -ContentType "application/json" -Body (To-Json $VoucherBody)
if ($Voucher.code -ne $VoucherCode) { throw "Voucher create returned unexpected code." }
Pass "Admin create voucher $VoucherCode"

$Quote = Invoke-RestMethod -Method Post -Uri "$BaseUrl/commerce/vouchers/quote" -ContentType "application/json" -Body (To-Json @{code=$VoucherCode;orderAmount=130000})
if ([decimal]$Quote.discountAmount -ne 13000) { throw "Expected discount 13000, got $($Quote.discountAmount)." }
if ([decimal]$Quote.finalAmount -ne 117000) { throw "Expected final amount 117000, got $($Quote.finalAmount)." }
Pass "Voucher quote 130000 -> discount 13000 -> final 117000"

$VoucherBody.active=$false
$UpdatedVoucher = Invoke-RestMethod -Method Put -Uri "$BaseUrl/admin/commerce/vouchers/$($Voucher.id)" -Headers $H -ContentType "application/json" -Body (To-Json $VoucherBody)
if ($UpdatedVoucher.active -ne $false) { throw "Voucher did not become inactive." }
Pass "Admin pause voucher"

$Rejected=$false
try {
  Invoke-RestMethod -Method Post -Uri "$BaseUrl/commerce/vouchers/quote" -ContentType "application/json" -Body (To-Json @{code=$VoucherCode;orderAmount=130000}) | Out-Null
}
catch {
  if ((Get-StatusCode $_) -eq 409) { $Rejected=$true }
  else { throw }
}
if (-not $Rejected) { throw "Inactive voucher was still accepted." }
Pass "Paused voucher is rejected with HTTP 409"

$StaffEmail = "staff.v12.$Stamp@cine.local"
$EmployeeCode = "T12" + $Stamp.ToString().Substring([Math]::Max(0,$Stamp.ToString().Length-10))
$StaffPassword = "V12.Test@$Stamp" + "Aa1"
$StaffBody = @{
  employeeCode=$EmployeeCode
  email=$StaffEmail
  password=$StaffPassword
  fullName="V12 Test Staff"
  phone="0911111111"
  role="STAFF"
  cinemaId=$CinemaIdText
  jobTitle="Check-in test"
  employmentStatus="ACTIVE"
  hireDate=(Get-Date).ToString("yyyy-MM-dd")
  accountEnabled=$true
}
$Staff = Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/staff" -Headers $H -ContentType "application/json" -Body (To-Json $StaffBody)
Pass "Admin create STAFF account"

$Deleted = Invoke-RestMethod -Method Delete -Uri "$BaseUrl/admin/staff/$($Staff.userId)" -Headers $H
Pass "Admin delete STAFF account; cancelledShifts=$($Deleted.cancelledShifts)"

$StaffList = @(Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/staff" -Headers $H)
if (($StaffList | Where-Object { $_.userId -eq $Staff.userId }).Count -ne 0) { throw "Deleted staff still appears in active staff list." }
Pass "Deleted STAFF is hidden from staff management list"

Write-Host "ALL V12 SMOKE TESTS PASSED" -ForegroundColor Green
