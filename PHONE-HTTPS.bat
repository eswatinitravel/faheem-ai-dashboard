@echo off
cd /d "%~dp0"
title Faheem AI - Phone HTTPS (phone mic)
echo.
echo  Phone page ka apna mic HTTPS mangta hai. Yeh laptop par apna (self-signed) certificate banata hai.
echo  Phone par pehli dafa "Not secure" aayega: Advanced ^> Proceed dabayein. Yeh sirf aap ka Wi-Fi hai.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\phone-https.ps1"
if errorlevel 1 (pause & exit /b 1)
netsh advfirewall firewall show rule name="Faheem AI Phone HTTPS" >nul 2>&1 || netsh advfirewall firewall add rule name="Faheem AI Phone HTTPS" dir=in action=allow protocol=TCP localport=3443 profile=private >nul 2>&1
echo.
echo  Ho gaya. Dashboard restart karein (STOP.bat phir START.bat).
echo  Jarvis ^> Jarvis Phone ka naya QR https wala hoga. Wi-Fi ya IP badle to yeh file dobara chalayein.
pause
