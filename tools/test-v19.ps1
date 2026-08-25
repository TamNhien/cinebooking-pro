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
function SecureString-ToPlainText([Security.SecureString]$SecureString) {
  $Bstr=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($Bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($Bstr) }
}
function Read-DotEnv([string]$Path) {
  $Result=@{}; if(-not (Test-Path $Path)){return $Result}
  foreach($Line in Get-Content $Path){$T=$Line.Trim();if(-not $T -or $T.StartsWith('#')){continue};$I=$T.IndexOf('=');if($I -le 0){continue};$K=$T.Substring(0,$I).Trim();$V=$T.Substring($I+1).Trim();$Result[$K]=$V}
  return $Result
}

Write-Host "CineBooking V19 inventory smoke test" -ForegroundColor Cyan
$EnvFile=Read-DotEnv (Join-Path (Get-Location) '.env')
if([string]::IsNullOrWhiteSpace($AdminEmail)){$AdminEmail=if($EnvFile.ContainsKey('ADMIN_EMAIL') -and $EnvFile['ADMIN_EMAIL']){$EnvFile['ADMIN_EMAIL']}else{'admin@cine.local'}}
if([string]::IsNullOrWhiteSpace($AdminPassword)){$Secure=Read-Host "Enter CURRENT password for $AdminEmail (hidden)" -AsSecureString;$Plain=SecureString-ToPlainText $Secure}else{$Plain=$AdminPassword}
try{$Admin=Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/login" -ContentType 'application/json' -Body (To-Json @{email=$AdminEmail;password=$Plain})}finally{$Plain=$null}
if($Admin.role -ne 'ADMIN'){throw "Expected ADMIN role."}
$H=Headers $Admin.accessToken
Pass "Admin login"

$Summary=Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/inventory" -Headers $H
$Products=@($Summary.products)
if($Products.Count -eq 1 -and $Products[0] -is [System.Array]){$Products=@($Products[0])}
Pass "Inventory endpoint reachable; products=$($Products.Count)"
if($Products.Count -eq 0){Warn "No concession products exist; adjustment test skipped.";exit 0}
$Product=$Products | Where-Object {$_.inventoryEnabled -eq $true} | Select-Object -First 1
if($null -eq $Product){Warn "No inventory-enabled product exists; adjustment test skipped.";exit 0}

$Original=[int]$Product.stockOnHand
$ProductId=[string]$Product.productId
$Restocked=Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/inventory/adjustments" -Headers $H -ContentType 'application/json' -Body (To-Json @{productId=$ProductId;operation='RESTOCK';quantity=3;note='Bổ sung tồn kho trước ca tối'})
if([int]$Restocked.stockOnHand -ne ($Original+3)){throw "RESTOCK did not increase stock by 3."}
Pass "RESTOCK +3 works"

$Restored=Invoke-RestMethod -Method Post -Uri "$BaseUrl/admin/inventory/adjustments" -Headers $H -ContentType 'application/json' -Body (To-Json @{productId=$ProductId;operation='SET';quantity=$Original;note='Điều chỉnh tồn kho về số lượng sau kiểm kê'})
if([int]$Restored.stockOnHand -ne $Original){throw "SET did not restore original stock."}
Pass "SET restores original stock"

$Moves=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/admin/inventory/movements?productId=$ProductId" -Headers $H)
if($Moves.Count -eq 1 -and $Moves[0] -is [System.Array]){$Moves=@($Moves[0])}
if(($Moves | Where-Object {$_.note -in @('Bổ sung tồn kho trước ca tối','Điều chỉnh tồn kho về số lượng sau kiểm kê')}).Count -lt 2){throw "Expected inventory movement history entries were not found."}
Pass "Inventory movement ledger recorded both changes"

$Public=@(Invoke-RestMethod -Method Get -Uri "$BaseUrl/commerce/products")
if($Public.Count -eq 1 -and $Public[0] -is [System.Array]){$Public=@($Public[0])}
$PublicProduct=$Public | Where-Object {$_.id -eq $ProductId} | Select-Object -First 1
if($null -eq $PublicProduct){throw "Product not found in public commerce endpoint."}
if($null -eq $PublicProduct.stockAvailable){throw "Public product response does not include stockAvailable."}
Pass "Public commerce endpoint exposes stock availability"

Write-Host "ALL V19 INVENTORY SMOKE TESTS PASSED" -ForegroundColor Green
Write-Host "INFO: The smoke test restores the original stock quantity but keeps the two ledger entries for audit history." -ForegroundColor DarkGray
