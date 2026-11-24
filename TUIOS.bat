@echo off
REM v3.25 TUIOS (MIT, github.com/Gaurav-Gosain/tuios) laptop par lagao: tuios + tuios-web
REM Jagah: %USERPROFILE%\.faheem-ai\bin  (admin ki zaroorat nahi)
setlocal
set BIN=%USERPROFILE%\.faheem-ai\bin
if not exist "%BIN%" mkdir "%BIN%"
echo TUIOS ka naya version GitHub se dhoond raha hoon...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop'; $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') {'arm64'} else {'x86_64'};" ^
  "$r = Invoke-RestMethod -Uri 'https://api.github.com/repos/Gaurav-Gosain/tuios/releases/latest' -Headers @{ 'User-Agent'='faheem-ai' };" ^
  "$tmp = Join-Path $env:TEMP 'faheem-tuios'; New-Item -ItemType Directory -Force -Path $tmp | Out-Null;" ^
  "foreach ($n in @('tuios','tuios-web')) { $a = $r.assets | Where-Object { $_.name -eq ($n + '_' + $r.tag_name.TrimStart('v') + '_Windows_' + $arch + '.tar.gz') } | Select-Object -First 1;" ^
  "  if (-not $a) { Write-Host ('Nahi mila: ' + $n); continue }; $f = Join-Path $tmp $a.name; Write-Host ('Download: ' + $a.name); Invoke-WebRequest -Uri $a.browser_download_url -OutFile $f -UseBasicParsing;" ^
  "  tar -xzf $f -C $tmp; Get-ChildItem -Path $tmp -Recurse -Filter ($n + '.exe') | Select-Object -First 1 | Copy-Item -Destination '%BIN%' -Force };" ^
  "Write-Host ('TUIOS ' + $r.tag_name + ' lag gaya: %BIN%')"
if errorlevel 1 (
  echo.
  echo Kuch ghalat hua. Internet check karein ya yahan se khud lein: https://github.com/Gaurav-Gosain/tuios/releases
  pause
  exit /b 1
)
echo.
echo Ab Jarvis se kahiye: "TUIOS kholo"  (browser mein http://localhost:7681 khulega)
pause
