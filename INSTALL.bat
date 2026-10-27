@echo off
title Faheem AI - Install
cd /d "%~dp0"
echo.
echo   ===== Faheem AI Setup =====
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nahi mila. Browser khul raha hai, LTS install karein phir INSTALL dobara chalayein.
  start https://nodejs.org
  pause
  exit /b
)
echo Purana Faheem AI (agar chal raha ho) band ho raha hai...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"
echo [1/3] Packages install ho rahe hain (pehli dafa 1-3 minute)...
call npm install --no-audit --no-fund
if errorlevel 1 goto fail
echo [2/3] App tayyar ho rahi hai...
call npm run build
if errorlevel 1 goto fail
echo [3/3] Desktop aur Start Menu shortcut ban rahe hain...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\make-shortcut.ps1"
echo.
echo   Ho gaya! Ab Desktop par "Faheem AI" icon se kholein.
echo.
call "%~dp0START.bat"
timeout /t 5 >nul
exit /b
:fail
echo.
echo   Kuch ghalat hua. Upar wala laal error copy kar ke Hark ko bhejein.
pause
