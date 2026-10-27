# Desktop/Start Menu shortcut: tray chal raha ho to sirf app kholo, warna tray start karo (woh server + app khol dega).
$root = Split-Path -Parent $PSScriptRoot
$url = "http://localhost:3000"
$tray = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*tray.ps1*" }
if (-not $tray) {
  Start-Process -FilePath "wscript.exe" -ArgumentList "`"$root\scripts\tray.vbs`""
  exit
}
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($edge) { Start-Process $edge "--app=$url --window-size=1400,900" }
elseif ($chrome) { Start-Process $chrome "--app=$url --window-size=1400,900" }
else { Start-Process $url }
