# Faheem AI tray: laptop on hote hi chalta hai, server start karta hai, aur taskbar (ghari ke paas) mein icon rakhta hai.
param([switch]$NoOpen)
$root = Split-Path -Parent $PSScriptRoot
$url = "http://localhost:3000"

# Sirf ek tray chale.
$created = $false
$mutex = New-Object System.Threading.Mutex($true, "Global\FaheemAITray", [ref]$created)
if (-not $created) { exit }

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

function Test-Up { try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 | Out-Null; return $true } catch { return $false } }

function Start-Server {
  if (Test-Up) { return }
  if (-not (Test-Path (Join-Path $root ".next\BUILD_ID"))) {
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run build" -WorkingDirectory $root -WindowStyle Hidden -Wait
  }
  Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run start" -WorkingDirectory $root -WindowStyle Hidden
  for ($i = 0; $i -lt 80; $i++) { Start-Sleep -Milliseconds 700; if (Test-Up) { break } }
}

function Stop-Server {
  Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
}

function Open-App {
  $edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
  $chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($edge) { Start-Process $edge "--app=$url --window-size=1400,900" }
  elseif ($chrome) { Start-Process $chrome "--app=$url --window-size=1400,900" }
  else { Start-Process $url }
}

$icon = New-Object System.Windows.Forms.NotifyIcon
$ico = Join-Path $root "public\icon.ico"
if (Test-Path $ico) { $icon.Icon = New-Object System.Drawing.Icon($ico) } else { $icon.Icon = [System.Drawing.SystemIcons]::Application }
$icon.Text = "Faheem AI"
$icon.Visible = $true

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$open = $menu.Items.Add("Faheem AI kholein")
$restart = $menu.Items.Add("Server restart")
$update = $menu.Items.Add("Update check")
$menu.Items.Add("-") | Out-Null
$quit = $menu.Items.Add("Band karein")
$icon.ContextMenuStrip = $menu

$open.add_Click({ Start-Server; Open-App })
$icon.add_DoubleClick({ Start-Server; Open-App })
$restart.add_Click({ $icon.ShowBalloonTip(2000, "Faheem AI", "Server restart ho raha hai...", "Info"); Stop-Server; Start-Sleep 2; Start-Server; $icon.ShowBalloonTip(2000, "Faheem AI", "Tayyar!", "Info") })
$update.add_Click({ Start-Process -FilePath (Join-Path $root "UPDATE.bat") -WorkingDirectory $root })
$quit.add_Click({ Stop-Server; $icon.Visible = $false; $icon.Dispose(); [System.Windows.Forms.Application]::Exit() })

Start-Server
if (-not $NoOpen) { Open-App }
$icon.ShowBalloonTip(2500, "Faheem AI", "Chal raha hai. Icon par double-click karein.", "Info")

# Har 30 second: server gir jaye to khud dobara chalayein.
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 30000
$timer.add_Tick({ if (-not (Test-Up)) { Start-Server } })
$timer.Start()

[System.Windows.Forms.Application]::Run()
$mutex.ReleaseMutex()
