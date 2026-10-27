# Faheem AI self-update: downloads the latest version from GitHub, keeps your keys and chats, rebuilds, restarts.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$Host.UI.RawUI.WindowTitle = "Faheem AI - Update"
try {
  $repo = (Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json).updateRepo
  Write-Host "Naya version download ho raha hai ($repo)..."
  $tmp = Join-Path $env:TEMP ("faheem-ai-update-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $zip = Join-Path $tmp "update.zip"
  Invoke-WebRequest -Uri "https://codeload.github.com/$repo/zip/refs/heads/main" -OutFile $zip -UseBasicParsing
  Expand-Archive -Path $zip -DestinationPath $tmp -Force
  $src = Get-ChildItem -Path $tmp -Directory | Select-Object -First 1

  Write-Host "Purana server band ho raha hai..."
  Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Seconds 2

  Write-Host "Files update ho rahi hain (keys aur chats mehfooz)..."
  $keep = @("data", ".env.local", "node_modules", ".next")
  Get-ChildItem -Path $src.FullName -Force | Where-Object { $keep -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $root -Recurse -Force
  }

  Set-Location $root
  Write-Host "Packages..."
  cmd /c "npm install --no-audit --no-fund"
  if ($LASTEXITCODE -ne 0) { throw "npm install fail" }
  Write-Host "Build..."
  cmd /c "npm run build"
  if ($LASTEXITCODE -ne 0) { throw "build fail" }

  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  Write-Host "Update mukammal! App dobara khul rahi hai..."
  & (Join-Path $root "scripts\start.ps1")
  Start-Sleep -Seconds 3
} catch {
  Write-Host ""
  Write-Host "Update mein masla: $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "Yeh message Hark ko bhejein. Purana version START.bat se chal jaye ga."
  Read-Host "Enter dabayein"
}
