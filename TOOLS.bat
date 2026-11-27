@echo off
title Faheem AI - Free Tools
echo.
echo  Faheem AI - Free tools (Jarvis inhein khol sakta hai)
echo  ----------------------------------------------------
echo  1) ShareX        - screenshot, OCR, screen recording
echo  2) HandBrake     - video chhoti / convert
echo  3) ActivityWatch - "aaj kitna kaam kiya" ke liye
echo  4) Krokiet       - duplicate aur bari files (download page)
echo  5) NeonClipping  - YouTube se reels (download page)
echo  6) Meetily       - meeting notes (download page)
echo  7) Stirling-PDF  - PDF tools (download page)
echo  A) 1, 2 aur 3 sab winget se
echo.
set /p c=Number likhein (ya Enter = band): 
if "%c%"=="" exit /b
if /i "%c%"=="A" (call :w ShareX.ShareX & call :w HandBrake.HandBrake & call :w ActivityWatch.ActivityWatch & goto done)
if "%c%"=="1" call :w ShareX.ShareX
if "%c%"=="2" call :w HandBrake.HandBrake
if "%c%"=="3" call :w ActivityWatch.ActivityWatch
if "%c%"=="4" start "" "https://github.com/qarmin/czkawka/releases"
if "%c%"=="5" start "" "https://github.com/iamajmeena/neonclipping"
if "%c%"=="6" start "" "https://github.com/Zackriya-Solutions/meetily/releases"
if "%c%"=="7" start "" "https://github.com/Stirling-Tools/Stirling-PDF"
:done
echo.
echo  Ho gaya. Lagne ke baad Jarvis se kahein, jaise "reels banao" ya "duplicate files dhoondo".
pause
exit /b

:w
where winget >nul 2>&1 || (echo  winget nahi mila. Microsoft Store se "App Installer" lagayein. & exit /b)
echo  %1 laga raha hoon...
winget install -e --id %1 --accept-source-agreements --accept-package-agreements || echo  %1 winget se nahi laga. Uski website se download karein.
exit /b
