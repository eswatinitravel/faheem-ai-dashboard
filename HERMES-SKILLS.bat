@echo off
chcp 65001 >nul
title Hermes ke liye design skills
echo.
echo  Hermes Agent mein 2 design skills daal raha hoon:
echo   1) faheem-design  (chhoti, free models ke liye)
echo   2) hallmark       (poori, Nutlope/hallmark, MIT)
echo.
where hermes >nul 2>nul
if errorlevel 1 (
  echo  [!] "hermes" command nahi mila. Pehle Hermes Agent khol kar check karein ke install hai.
  pause
  exit /b 1
)
echo  --- 1/2 faheem-design ---
hermes skills install eswatinitravel/faheem-ai-dashboard/hermes-skills/faheem-design
echo.
echo  --- 2/2 hallmark ---
hermes skills install Nutlope/hallmark/skills/hallmark
if exist "%LOCALAPPDATA%\hermes\skills\hallmark\SKILL.md" goto hall_ok
echo  Hermes index purana hai, seedha GitHub se utaar raha hoon...
set "HT=%TEMP%\hallmark-dl"
if exist "%HT%" rmdir /s /q "%HT%"
mkdir "%HT%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://codeload.github.com/Nutlope/hallmark/zip/refs/heads/main' -OutFile '%HT%\h.zip'; Expand-Archive -Force '%HT%\h.zip' '%HT%'"
if not exist "%HT%\hallmark-main\skills\hallmark\SKILL.md" (
  echo  [!] Download nahi hua. Internet check karke dobara chalayein.
  goto hall_end
)
if not exist "%LOCALAPPDATA%\hermes\skills" mkdir "%LOCALAPPDATA%\hermes\skills"
xcopy /e /i /y /q "%HT%\hallmark-main\skills\hallmark" "%LOCALAPPDATA%\hermes\skills\hallmark" >nul
rmdir /s /q "%HT%"
:hall_ok
echo  Installed: hallmark
:hall_end
echo.
echo  Mukammal. Hermes mein istemal:  /faheem-design Vestire ka homepage behtar karo
echo  Ya:                              /hallmark ek luxury fashion store ka landing page
echo.
pause
