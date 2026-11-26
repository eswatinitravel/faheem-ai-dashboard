@echo off
rem v3.29: Faheem AI ko purane version par wapas (aakhri update se pehle wala backup). Chats aur keys mehfooz.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update.ps1" -Rollback
