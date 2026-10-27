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
echo.
echo  Mukammal. Hermes mein istemal:  /faheem-design Vestire ka homepage behtar karo
echo  Ya:                              /hallmark ek luxury fashion store ka landing page
echo.
pause
