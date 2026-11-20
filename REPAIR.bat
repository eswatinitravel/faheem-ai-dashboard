@echo off
REM v3.17.1: Dashboard na khule to is file par double-click. Sab kuch dikhne wali window mein + log Desktop par.
cd /d "%~dp0"
set LOG=%USERPROFILE%\Desktop\faheem-ai-repair-log.txt
echo Faheem AI repair %date% %time% > "%LOG%"
echo Purana server band...
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"
echo Purana build hata raha hoon...
if exist ".next" rmdir /s /q ".next"
echo Packages (2-5 minute)...
call npm install --no-audit --no-fund >> "%LOG%" 2>&1
if errorlevel 1 goto fail
echo Build (2-5 minute)...
call npm run build >> "%LOG%" 2>&1
if errorlevel 1 goto fail
for /f "usebackq delims=" %%v in (`node -p "require('./package.json').version"`) do echo %%v> ".next\faheem-version.txt"
echo Theek ho gaya! Dashboard khul raha hai...
start "" wscript.exe "%~dp0scripts\tray.vbs"
timeout /t 5 >nul
exit /b 0
:fail
echo.
echo MASLA: Desktop par faheem-ai-repair-log.txt ki aakhri lines Hark ko bhejein.
pause
