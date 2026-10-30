@echo off
chcp 65001 >nul
title Hermes ke liye design skills
echo.
echo  Hermes Agent mein 4 design skills daal raha hoon:
echo   1) faheem-design  (chhoti, free models ke liye)
echo   2) hallmark       (poori, Nutlope/hallmark, MIT)
echo   3) ui-ux-pro-max  (design database, nextlevelbuilder, MIT)
echo   4) impeccable     (62 design checks + 24 commands, pbakaus, Apache-2.0)
echo.
where hermes >nul 2>nul
if errorlevel 1 (
  echo  [!] "hermes" command nahi mila. Pehle Hermes Agent khol kar check karein ke install hai.
  pause
  exit /b 1
)
echo  --- 1/4 faheem-design ---
hermes skills install eswatinitravel/faheem-ai-dashboard/hermes-skills/faheem-design
echo.
echo  --- 2/4 hallmark ---
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
echo  --- 3/4 ui-ux-pro-max ---
if exist "%LOCALAPPDATA%\hermes\skills\ui-ux-pro-max\SKILL.md" goto uu_ok
set "UT=%TEMP%\uupm-dl"
if exist "%UT%" rmdir /s /q "%UT%"
mkdir "%UT%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://codeload.github.com/nextlevelbuilder/ui-ux-pro-max-skill/zip/refs/heads/main' -OutFile '%UT%\u.zip'; Expand-Archive -Force '%UT%\u.zip' '%UT%'"
if not exist "%UT%\ui-ux-pro-max-skill-main\.claude\skills\ui-ux-pro-max\SKILL.md" (
  echo  [!] Download nahi hua. Internet check karke dobara chalayein.
  goto uu_end
)
if not exist "%LOCALAPPDATA%\hermes\skills" mkdir "%LOCALAPPDATA%\hermes\skills"
xcopy /e /i /y /q "%UT%\ui-ux-pro-max-skill-main\.claude\skills\ui-ux-pro-max" "%LOCALAPPDATA%\hermes\skills\ui-ux-pro-max" >nul
rmdir /s /q "%UT%"
:uu_ok
echo  Installed: ui-ux-pro-max
where python >nul 2>nul
if errorlevel 1 echo  Note: is skill ki search ke liye Python 3 chahiye (python.org). Dashboard mein yeh bina Python chalti hai.
:uu_end
echo.
echo  --- 4/4 impeccable ---
if exist "%LOCALAPPDATA%\hermes\skills\impeccable\SKILL.md" goto imp_ok
if exist "%USERPROFILE%\.hermes\skills\impeccable\SKILL.md" goto imp_ok
hermes skills install impeccable
if exist "%LOCALAPPDATA%\hermes\skills\impeccable\SKILL.md" goto imp_ok
if exist "%USERPROFILE%\.hermes\skills\impeccable\SKILL.md" goto imp_ok
echo  Hermes index mein nahi mila, Impeccable ke apne installer se daal raha hoon...
set "IMPECCABLE_NO_TELEMETRY=1"
where npx >nul 2>nul
if not errorlevel 1 call npx -y impeccable@latest install --providers=hermes --scope=global -y
if exist "%LOCALAPPDATA%\hermes\skills\impeccable\SKILL.md" goto imp_ok
if exist "%USERPROFILE%\.hermes\skills\impeccable\SKILL.md" goto imp_ok
echo  Seedha GitHub se utaar raha hoon (Hermes package)...
set "IT=%TEMP%\imp-dl"
if exist "%IT%" rmdir /s /q "%IT%"
mkdir "%IT%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing 'https://codeload.github.com/DevvGwardo/impeccable/zip/refs/heads/main' -OutFile '%IT%\i.zip'; Expand-Archive -Force '%IT%\i.zip' '%IT%'"
if not exist "%IT%\impeccable-main\SKILL.md" (
  echo  [!] Download nahi hua. Internet check karke dobara chalayein.
  goto imp_end
)
if not exist "%LOCALAPPDATA%\hermes\skills\impeccable" mkdir "%LOCALAPPDATA%\hermes\skills\impeccable"
copy /y "%IT%\impeccable-main\SKILL.md" "%LOCALAPPDATA%\hermes\skills\impeccable\" >nul
copy /y "%IT%\impeccable-main\LICENSE" "%LOCALAPPDATA%\hermes\skills\impeccable\" >nul
xcopy /e /i /y /q "%IT%\impeccable-main\reference" "%LOCALAPPDATA%\hermes\skills\impeccable\reference" >nul
if exist "%IT%\impeccable-main\scripts" xcopy /e /i /y /q "%IT%\impeccable-main\scripts" "%LOCALAPPDATA%\hermes\skills\impeccable\scripts" >nul
rmdir /s /q "%IT%"
:imp_ok
echo  Installed: impeccable
:imp_end
echo.
echo  ---- Extra tools (optional): Playwright, Graphify, 21st MCP, Compound ----
set "XT=N"
set /p XT= Extra tools install karein? (Y/N): 
if /i not "%XT%"=="Y" goto xt_end
pushd "%USERPROFILE%"
where npm >nul 2>nul && (
  echo  Playwright CLI...
  call npm i -g @playwright/cli@latest
  call playwright-cli install --skills
) || echo  [!] npm nahi mila - pehle Node.js install karein.
where uv >nul 2>nul && (
  echo  Graphify via uv...
  call uv tool install graphifyy
) || (
  echo  Graphify via pip...
  call pip install graphifyy
)
where graphify >nul 2>nul && call graphify install
popd
echo.
echo  21st MCP (free key: https://21st.dev/mcp) - key ho to chalayein:
echo     npx @21st-dev/cli@latest init --client claude --write
echo  Compound Engineering - Claude Code mein likhein:
echo     /plugin marketplace add EveryInc/compound-engineering-plugin
echo     /plugin install compound-engineering
:xt_end
echo.
echo  Mukammal. Hermes mein istemal:  /faheem-design Vestire ka homepage behtar karo
echo  Ya:                              /hallmark ek luxury fashion store ka landing page
echo  Ya:                              /ui-ux-pro-max fashion ecommerce ka design system
echo  Ya:                              /impeccable audit  (ya critique, polish, bolder)
echo.
pause
