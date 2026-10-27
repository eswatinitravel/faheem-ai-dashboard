# Starts the Faheem AI server in the background (if not running) and opens it as an app window.
$root = Split-Path -Parent $PSScriptRoot
$url = "http://localhost:3000"

function Test-Up {
  try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null; return $true } catch { return $false }
}

if (-not (Test-Up)) {
  if (-not (Test-Path (Join-Path $root ".next\BUILD_ID"))) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run build" -WorkingDirectory $root -WindowStyle Hidden -Wait
  }
  Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run start" -WorkingDirectory $root -WindowStyle Hidden
  for ($i = 0; $i -lt 60; $i++) { Start-Sleep -Milliseconds 700; if (Test-Up) { break } }
}

$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($edge) { Start-Process $edge "--app=$url --window-size=1400,900" }
elseif ($chrome) { Start-Process $chrome "--app=$url --window-size=1400,900" }
else { Start-Process $url }
