@echo off
setlocal

echo 🔄 Running SmartBiz Green Screen to Transparent WebM Conversion...

:: Get current script directory
set "SCRIPT_DIR=%~dp0"
set "SCRIPT=%SCRIPT_DIR%convert_green_to_webm.ps1"

:: Check if the PowerShell script exists
if not exist "%SCRIPT%" (
    echo ❌ PowerShell script not found: %SCRIPT%
    pause
    exit /b
)

:: Run PowerShell script with bypass policy
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"

echo.
echo ✅ Done! Press any key to exit...
pause
