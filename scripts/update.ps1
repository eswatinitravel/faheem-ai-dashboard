# Faheem AI self-update: downloads the latest version from GitHub, keeps your chats (keys live in ~/.faheem-ai), rebuilds, restarts.
# v3.29: naya version lagane se pehle purane ka backup (backups\v<version>-<tareekh>), aur install / build / start fail ho to
# khud purana version wapas. "-Rollback" (ROLLBACK.bat ya dashboard ka "Purane version par wapas") aakhri backup wapas lagata hai.
param([switch]$Rollback)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$Host.UI.RawUI.WindowTitle = if ($Rollback) { "Faheem AI - Purane version par wapas" } else { "Faheem AI - Update" }
# Sirf ek updater chale (do dafa click ho jaye to bhi).
$created = $false
$mx = New-Object System.Threading.Mutex($true, "Global\FaheemAIUpdate", [ref]$created)
if (-not $created) { Write-Host "Update pehle se chal raha hai."; Start-Sleep -Seconds 3; exit }
$logDir = Join-Path $root "data"; if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
try { Start-Transcript -Path (Join-Path $logDir "update.log") -Force | Out-Null } catch {}

function Get-Ver { (Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json).version }
function Stop-Server {
  Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*tray.ps1*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 2
}
# npm install + build, phir version ka nishan (tray dobara build na kare). Output Out-Host par, taake function sirf version lautaye.
function Install-Build {
  Set-Location $root
  $env:CI = "1"; $env:NEXT_TELEMETRY_DISABLED = "1"
  Write-Host "Packages..."
  cmd /c "npm install --no-audit --no-fund" | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "npm install fail" }
  Write-Host "Build..."
  cmd /c "npm run build" | Out-Host
  if ($LASTEXITCODE -ne 0) { throw "build fail" }
  $v = Get-Ver
  Set-Content -Path (Join-Path $root ".next\faheem-version.txt") -Value $v
  return $v
}
# App chalao aur 3 minute tak dekho ke server sahi version ke sath jawab de raha hai.
function Start-And-Check($want) {
  & (Join-Path $root "scripts\start.ps1") | Out-Host
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 3
    try {
      $r = Invoke-WebRequest -Uri "http://localhost:3000/api/update?local=1" -UseBasicParsing -TimeoutSec 5
      if ((($r.Content | ConvertFrom-Json).current) -eq $want) { return $true }
    } catch {}
  }
  return $false
}
# Backup wapas: files, phir purane version ke packages + build + start.
function Restore-Backup($backupDir) {
  Write-Host "Purana version wapas lag raha hai..." -ForegroundColor Yellow
  Stop-Server
  if ($backupDir) { cmd /c "node `"$helper`" restore `"$root`" `"$backupDir`"" | Out-Host } else { cmd /c "node `"$helper`" restore `"$root`"" | Out-Host }
  if ($LASTEXITCODE -ne 0) { throw "backup wapas nahi laga" }
  $v = Install-Build
  if (-not (Start-And-Check $v)) { throw "purana version (v$v) bhi start nahi hua" }
  return $v
}

Write-Host ""
Write-Host "  ==============================="
if ($Rollback) { Write-Host "   Faheem AI - purane version par wapas" } else { Write-Host "   Faheem AI - naya version install" }
Write-Host "  ==============================="
Write-Host ""
# Doosre software ki tarah: pehle app ki window band.
Write-Host "App band ho rahi hai..."
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { ($_.Name -eq "msedge.exe" -or $_.Name -eq "chrome.exe") -and $_.CommandLine -like "*--app=http://localhost:3000*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

$tmp = Join-Path $env:TEMP ("faheem-ai-update-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null
# Backup helper ki apni copy: naye version ki files is ke oopar aa jayein tab bhi wapsi purane (chalte hue) helper se.
$helper = Join-Path $tmp "update-backup.mjs"
Copy-Item -Path (Join-Path $root "scripts\update-backup.mjs") -Destination $helper -Force

if ($Rollback) {
  try {
    $from = Get-Ver
    $v = Restore-Backup $null
    Write-Host "Wapas v$v par (pehle v$from tha). Aap ki chats aur keys mehfooz hain." -ForegroundColor Green
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
  } catch {
    Write-Host ""
    Write-Host "Wapsi mein masla: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Yeh message Hark ko bhejein. Naya version dobara lagane ke liye UPDATE.bat chalayein."
    Read-Host "Enter dabayein"
  }
  exit
}

$backupDir = $null
$applied = $false
try {
  $repo = (Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json).updateRepo
  Write-Host "Naya version download ho raha hai ($repo)..."
  $zip = Join-Path $tmp "update.zip"
  Invoke-WebRequest -Uri "https://codeload.github.com/$repo/zip/refs/heads/main" -OutFile $zip -UseBasicParsing -TimeoutSec 300
  Expand-Archive -Path $zip -DestinationPath $tmp -Force
  $src = Get-ChildItem -Path $tmp -Directory | Select-Object -First 1

  Write-Host "Purana server band ho raha hai..."
  Stop-Server

  Write-Host "Purane version ka backup ban raha hai (node_modules, data, .next ke baghair)..."
  $backupDir = (cmd /c "node `"$helper`" backup `"$root`"" | Select-Object -Last 1)
  if ($LASTEXITCODE -ne 0 -or -not $backupDir -or -not (Test-Path $backupDir)) { $backupDir = $null; throw "backup nahi bana - update roka, kuch nahi badla" }
  Write-Host "Backup: $backupDir"

  Write-Host "Files update ho rahi hain (keys aur chats mehfooz)..."
  $keep = @("data", ".env.local", "node_modules", ".next")
  $keep += @("backups", ".env", ".git")
  $applied = $true
  Get-ChildItem -Path $src.FullName -Force | Where-Object { $keep -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $root -Recurse -Force
  }

  $ver = Install-Build
  try { & (Join-Path $root "scripts\make-shortcut.ps1") } catch {}
  Write-Host "Update mukammal (v$ver)! App dobara khul rahi hai..." -ForegroundColor Green
  if (-not (Start-And-Check $ver)) { throw "naya version (v$ver) start nahi hua" }
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  Start-Sleep -Seconds 3
} catch {
  Write-Host ""
  Write-Host "Update mein masla: $($_.Exception.Message)" -ForegroundColor Red
  if ($applied -and $backupDir) {
    try {
      $v = Restore-Backup $backupDir
      Write-Host "Purana version (v$v) wapas chal raha hai. Aap ki chats aur keys mehfooz hain." -ForegroundColor Green
    } catch {
      Write-Host "Purana version bhi wapas nahi laga: $($_.Exception.Message)" -ForegroundColor Red
      Write-Host "Backup yahan hai: $backupDir - ROLLBACK.bat dobara chalayein ya Hark ko yeh message bhejein."
    }
  } else {
    Write-Host "Kuch nahi badla. Purana version START.bat se chal jaye ga."
    try { & (Join-Path $root "scripts\start.ps1") } catch {}
  }
  Write-Host "Yeh message Hark ko bhejein."
  Read-Host "Enter dabayein"
}
