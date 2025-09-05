@echo off
:: Set path ya ffmpeg (weka kamili hadi ffmpeg.exe yako)
set FFMPEG=E:\SmartBiz_Assistance\smartbiz-landing\public\video-gifts\ffmpeg.exe

:: Weka jina la input video hapa
set INPUT=celestialhorse.mp4

:: Weka jina unalotaka kwa output file
set OUTPUT=celestialhorse_transparent.webm

:: Weka folder kamili la video kama ulivyoonesha kwenye screenshot
cd /d E:\SmartBiz_Assistance\smartbiz-landing\public\video-gifts

:: Endesha conversion na chromakey ya green
"%FFMPEG%" -i "%INPUT%" -vf "chromakey=0x00FF00:0.2:0.1" -c:v libvpx -pix_fmt yuva420p -auto-alt-ref 0 "%OUTPUT%"

pause
