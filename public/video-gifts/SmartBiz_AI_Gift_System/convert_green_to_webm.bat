@echo off
cd /d %~dp0
powershell -ExecutionPolicy Bypass -File .\remove_green.ps1
pause
