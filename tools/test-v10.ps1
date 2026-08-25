param(
  [string]$BaseUrl = "http://localhost/api",
  [string]$AdminEmail = "",
  [string]$AdminPassword = "",
  [switch]$UseEnvAdminPassword,
  [switch]$KeepTestData
)

$ErrorActionPreference = "Stop"

function To-Json($Object) {
  return ($Object | ConvertTo-Json -Depth 12 -Compress)
}

function Auth-Headers([string]$Token) {
  return @{ Authorization = "Bearer $Token" }
}

function Write-Pass([string]$Message) { Write-Host "PASS: $Message" -ForegroundColor Green }
function Write-Info([string]$Message) { Write-Host "INFO: $Message" -ForegroundColor Cyan }
function Write-Warn([string]$Message) { Write-Host "WARN: $Message" -ForegroundColor Yellow }

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
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Bstr)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr)
  }
}

function Get-StatusCode($ErrorRecord) {
  try {
    return [int]$ErrorRecord.Exception.Response.StatusCode
  }
  catch {
    return $null
  }
}

function Get-HttpErrorBody($ErrorRecord) {
  try {
    if ($ErrorRecord.ErrorDetails -and $ErrorRecord.ErrorDetails.Message) {
      return $ErrorRecord.ErrorDetails.Message
    }

    $Response = $ErrorRecord.Exception.Response
    if ($Response -and $Response.GetResponseStream()) {
      $Reader = New-Object IO.StreamReader($Response.GetResponseStream())
      try {
        return $Reader.ReadToEnd()
      }
      finally {
        $Reader.Dispose()
      }
    }
  }
  catch {
  }

  return ""
}

function Login([string]$Email, [string]$Password) {
  try {
    return Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType "application/json" -Body (To-Json @{ email = $Email; password = $Password })
  }
  catch {
    $Status = Get-StatusCode $_
    if ($Status -eq 401 -or $Status -eq 429) {
      return @{ Failed = $true; Status = $Status }
    }
    throw
  }
}

Write-Host "CineBooking V10.3 API smoke test" -ForegroundColor Cyan
Write-Host "PowerShell: $($PSVersionTable.PSVersion)" -ForegroundColor DarkGray

try {
  $MoviesResponse = Invoke-RestMethod -Method Get -Uri "$BaseUrl/movies"
  $MovieCount = ($MoviesResponse | Measure-Object).Count
  Write-Pass "Public API reachable; movies=$MovieCount"
}
catch {
  throw "Cannot call $BaseUrl/movies. Check nginx and backend containers first. Error: $($_.Exception.Message)"
}

$EnvFile = Read-DotEnv (Join-Path (Get-Location) '.env')

if ([string]::IsNullOrWhiteSpace($AdminEmail)) {
  if ($EnvFile.ContainsKey('ADMIN_EMAIL') -and -not [string]::IsNullOrWhiteSpace($EnvFile['ADMIN_EMAIL'])) {
    $AdminEmail = $EnvFile['ADMIN_EMAIL']
  }
  else {
    $AdminEmail = 'admin@cine.local'
  }
}

if ([string]::IsNullOrWhiteSpace($AdminPassword) -and $UseEnvAdminPassword) {
  if ($EnvFile.ContainsKey('ADMIN_PASSWORD')) {
    $AdminPassword = $EnvFile['ADMIN_PASSWORD']
  }
}

$Admin = $null

if (-not [string]::IsNullOrWhiteSpace($AdminPassword)) {
  $LoginResult = Login $AdminEmail $AdminPassword
  if ($LoginResult.Failed) {
    Write-Warn "Admin login failed with HTTP $($LoginResult.Status). The .env ADMIN_PASSWORD may only be the original bootstrap password."
    $AdminPassword = ""
  }
  else {
    $Admin = $LoginResult
  }
}

$Attempt = 0
while ($null -eq $Admin -and $Attempt -lt 3) {
  $Attempt++
  $SecurePassword = Read-Host "Enter CURRENT password for $AdminEmail (hidden)" -AsSecureString
  $PlainPassword = SecureString-ToPlainText $SecurePassword

  try {
    $LoginResult = Login $AdminEmail $PlainPassword
  }
  finally {
    $PlainPassword = $null
  }

  if ($LoginResult.Failed) {
    if ($LoginResult.Status -eq 429) {
      throw "Login is temporarily rate-limited. Wait for the Redis login lock window to expire before retrying."
    }
    Write-Warn "Admin login failed (attempt $Attempt of 3)."
  }
  else {
    $Admin = $LoginResult
  }
}

if ($null -eq $Admin) {
  Write-Host "Admin login failed after 3 attempts." -ForegroundColor Red
  Write-Host "Admin email: $AdminEmail"
  Write-Host "Verify the account with:" -ForegroundColor Yellow
  Write-Host "docker compose exec postgres psql -U cinebooking -d cinebooking -c `"SELECT email,role,account_enabled FROM app_user WHERE lower(email)=lower('$AdminEmail');`""
  throw "Smoke test stopped at Admin login."
}

if ($Admin.role -ne 'ADMIN') {
  throw "The account logged in successfully but role=$($Admin.role), expected ADMIN."
}

Write-Pass "Admin login ($AdminEmail)"
$AdminHeaders = Auth-Headers $Admin.accessToken

# PowerShell 5.1 Invoke-RestMethod can return a JSON array as one Object[] value.
# Piping to Select-Object forces enumeration so Cinema is ONE object, not the whole array.
$CinemasResponse = Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/cinemas" -Headers $AdminHeaders
$Cinema = $CinemasResponse | Select-Object -First 1
if ($null -eq $Cinema) {
  $Cinema = Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/cinemas" -Headers $AdminHeaders -ContentType "application/json" -Body (To-Json @{ name = 'CineHub Trung Sơn'; address = '9A Nguyễn Hữu Thọ, Khu đô thị Trung Sơn, TP.HCM' })
}

$CinemaIdText = [string]$Cinema.id
$ParsedCinemaId = [Guid]::Empty
if ([string]::IsNullOrWhiteSpace($CinemaIdText) -or -not [Guid]::TryParse($CinemaIdText, [ref]$ParsedCinemaId)) {
  throw "Admin cinema API did not yield one scalar UUID. Raw cinemaId='$CinemaIdText'."
}
Write-Pass "Cinema available: $($Cinema.name) [$CinemaIdText]"

$Suffix = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
$EmployeeCode = "CBSM" + $Suffix.ToString().Substring([Math]::Max(0,$Suffix.ToString().Length-8))
$StaffEmail = "hoang.long+$Suffix@example.com"
$StaffPassword = "V10_Test@2026"
$Staff = $null
$Shift = $null

try {
  $CreateStaffBody = @{
    employeeCode = $EmployeeCode
    email = $StaffEmail
    password = $StaffPassword
    fullName = 'Nguyễn Hoàng Long'
    phone = '0928123456'
    role = 'STAFF'
    cinemaId = $CinemaIdText
    jobTitle = 'Nhân viên soát vé'
    employmentStatus = 'ACTIVE'
    hireDate = (Get-Date).ToString('yyyy-MM-dd')
    accountEnabled = $true
  }

  $Staff = Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/staff" -Headers $AdminHeaders -ContentType "application/json" -Body (To-Json $CreateStaffBody)
  Write-Pass "Create STAFF account"

  $UpdateStaffBody = @{
    employeeCode = $EmployeeCode
    email = $StaffEmail
    fullName = 'Nguyễn Hoàng Long'
    phone = '0928234567'
    role = 'STAFF'
    cinemaId = $CinemaIdText
    jobTitle = 'Nhân viên kiểm soát lối vào'
    employmentStatus = 'ACTIVE'
    hireDate = (Get-Date).ToString('yyyy-MM-dd')
    accountEnabled = $true
    newPassword = $null
  }

  $Staff = Invoke-RestMethod -Method Put -Uri "$BaseUrl/admin/staff/$($Staff.userId)" -Headers $AdminHeaders -ContentType "application/json" -Body (To-Json $UpdateStaffBody)

  if ($Staff.phone -ne '0928234567' -or $Staff.jobTitle -ne 'Nhân viên kiểm soát lối vào') {
    throw "STAFF update verification failed."
  }
  Write-Pass "Edit STAFF account"

  $Now = Get-Date
  $ShiftBody = @{
    staffUserId = $Staff.userId
    shiftDate = $Now.ToString('yyyy-MM-dd')
    startTime = $Now.AddMinutes(-5).ToString('HH:mm')
    endTime = $Now.AddHours(2).ToString('HH:mm')
    note = 'Ca vận hành cổng soát vé'
  }

  $Shift = Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/shifts" -Headers $AdminHeaders -ContentType "application/json" -Body (To-Json $ShiftBody)
  Write-Pass "Create current STAFF shift"

  $OverlapRejected = $false
  try {
    Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/shifts" -Headers $AdminHeaders -ContentType "application/json" -Body (To-Json $ShiftBody) | Out-Null
  }
  catch {
    $Status = Get-StatusCode $_
    if ($Status -eq 409) {
      $OverlapRejected = $true
    }
    else {
      throw
    }
  }

  if (-not $OverlapRejected) {
    throw "Overlapping shift was not rejected with HTTP 409."
  }
  Write-Pass "Reject overlapping shift (409)"

  $StaffLogin = Login $StaffEmail $StaffPassword
  if ($StaffLogin.Failed) {
    throw "STAFF login failed with HTTP $($StaffLogin.Status)."
  }
  if ($StaffLogin.role -ne 'STAFF') {
    throw "Test account logged in with role=$($StaffLogin.role), expected STAFF."
  }
  Write-Pass "STAFF login"

  $StaffHeaders = Auth-Headers $StaffLogin.accessToken

  $GateBefore = Invoke-RestMethod -Method Get -Uri "$BaseUrl/staff/gate-status" -Headers $StaffHeaders
  if ($GateBefore.canScan) {
    throw "Gate should be locked before shift attendance starts."
  }
  Write-Pass "Gate locked before shift attendance"

  $Attendance = Invoke-RestMethod -Method Post -Uri "$BaseUrl/staff/attendance/start/$($Shift.id)" -Headers $StaffHeaders
  if ($Attendance.status -ne 'WORKING') {
    throw "Attendance did not enter WORKING state."
  }
  Write-Pass "Start shift attendance"

  $GateDuring = Invoke-RestMethod -Method Get -Uri "$BaseUrl/staff/gate-status" -Headers $StaffHeaders
  if (-not $GateDuring.canScan) {
    throw "Gate did not open after attendance started. Message: $($GateDuring.message)"
  }
  Write-Pass "Gate enabled during active shift"

  $AttendanceEnded = Invoke-RestMethod -Method Post -Uri "$BaseUrl/staff/attendance/end" -Headers $StaffHeaders
  if ($AttendanceEnded.status -ne 'COMPLETED') {
    throw "Attendance did not enter COMPLETED state."
  }
  Write-Pass "End shift attendance"

  $GateAfter = Invoke-RestMethod -Method Get -Uri "$BaseUrl/staff/gate-status" -Headers $StaffHeaders
  if ($GateAfter.canScan) {
    throw "Gate should be locked after attendance ends."
  }
  Write-Pass "Gate locked after shift"

  Write-Host "ALL V10.3 SMOKE TESTS PASSED" -ForegroundColor Green
}
catch {
  $Body = Get-HttpErrorBody $_
  if ($Body) {
    Write-Host "API response: $Body" -ForegroundColor DarkYellow
  }
  throw
}
finally {
  if ($KeepTestData) {
    Write-Warn "Keeping test data: $StaffEmail / $EmployeeCode"
  }
  elseif ($Staff -and $Staff.userId) {
    try {
      $DisableStaffBody = @{
        employeeCode = $EmployeeCode
        email = $StaffEmail
        fullName = 'Nguyễn Hoàng Long'
        phone = '0928234567'
        role = 'STAFF'
        cinemaId = $CinemaIdText
        jobTitle = 'Nhân viên kiểm soát lối vào'
        employmentStatus = 'INACTIVE'
        hireDate = (Get-Date).ToString('yyyy-MM-dd')
        accountEnabled = $false
        newPassword = $null
      }

      Invoke-RestMethod -Method Put -Uri "$BaseUrl/admin/staff/$($Staff.userId)" -Headers $AdminHeaders -ContentType "application/json" -Body (To-Json $DisableStaffBody) | Out-Null
      Write-Info "Disabled smoke-test account $StaffEmail. Audit and attendance history were kept."
    }
    catch {
      Write-Warn "Could not disable smoke-test account $StaffEmail automatically. Disable it in /admin/staff."
    }
  }
}
