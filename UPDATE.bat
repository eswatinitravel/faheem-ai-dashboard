@echo off
cd /d "%~dp0"
rem v3.29: "UPDATE.bat rollback" = purane version par wapas (ROLLBACK.bat jaisa)
if /i "%~1"=="rollback" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update.ps1" -Rollback
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update.ps1"
)
