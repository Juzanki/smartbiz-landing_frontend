@echo off
title 🎁 SmartBiz Gift Video Converter
color 0A

REM 📁 Nenda kwenye folda iliyo na script na video
cd /d "%~dp0"

REM 🧠 Hakikisha PowerShell 7+ inatumika (pwsh)
pwsh -ExecutionPolicy Bypass -File ".\convert_with_giftList.ps1"

REM 🟢 Maliza kwa kusubiri user adhibitishe
pause
