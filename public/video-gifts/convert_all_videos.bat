@echo off
chcp 65001 >nul
title 🎥 SmartBiz Video Converter - Batch WebM Transparency

:: ─────────────────────────────────────────────
:: 🔧 USER CONFIGURATION
:: ─────────────────────────────────────────────
set "FFMPEG=E:\SmartBiz_Assistance\smartbiz-landing\public\video-gifts\ffmpeg.exe"
set "SOURCE_DIR=E:\SmartBiz_Assistance\smartbiz-landing\public\video-gifts"
set "OUTPUT_DIR=converted"
set "CHROMAKEY=0x00FF00"
set "AUTO_DELETE_MP4=false"
set "ENABLE_PREVIEW=false"
set "LOG_FILE=conversion_log.txt"

:: 🖋️ Text Watermark Configuration
set "WATERMARK_TEXT=SmartBiz"
set "TEXT_COLOR=yellow"
set "TEXT_FONT=C:/Windows/Fonts/arial.ttf"
set "TEXT_SIZE=24"
set "TEXT_DURATION=enable='between(t,0,5)'"
set "TEXT_POSITION=x=w-tw-20:y=h-th-20"

:: ─────────────────────────────────────────────
:: 📁 Environment Preparation
:: ─────────────────────────────────────────────
if not exist "%FFMPEG%" (
    echo ❌ FFmpeg not found at: %FFMPEG%
    pause
    exit /b
)

cd /d "%SOURCE_DIR%"
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"
if exist "%LOG_FILE%" del "%LOG_FILE%"

:: 🖥️ Conversion Banner
echo.
echo ╔════════════════════════════════════════════════════════════════════╗
echo ║ 🚀 Starting Batch Conversion to Transparent .webm Files             ║
echo ║ 🎨 Chromakey Color: %CHROMAKEY%                                         ║
echo ║ 🖋️ Text Watermark: "%WATERMARK_TEXT%" (0–5s, bottom-right corner)     ║
echo ║ 📁 Output Folder: %CD%\%OUTPUT_DIR%                                 ║
echo ╚════════════════════════════════════════════════════════════════════╝
echo.

:: ─────────────────────────────────────────────
:: 🔁 CONVERT ALL .MP4 FILES
:: ─────────────────────────────────────────────
setlocal enabledelayedexpansion
set /a count=0
set /a failed=0

for %%F in (*.mp4) do (
    set "INPUT=%%~nF"
    set "OUTPUT=%OUTPUT_DIR%\!INPUT!_transparent.webm"

    echo 🔧 Processing: !INPUT!.mp4 → !OUTPUT!
    echo [START] !INPUT!.mp4 >> "%LOG_FILE%"

    "%FFMPEG%" -i "!INPUT!.mp4" ^
        -vf "chromakey=%CHROMAKEY%:0.2:0.1,format=yuva420p,drawtext=fontfile='%TEXT_FONT%':text='%WATERMARK_TEXT%':fontcolor=%TEXT_COLOR%:fontsize=%TEXT_SIZE%:%TEXT_POSITION%:%TEXT_DURATION%" ^
        -c:v libvpx -pix_fmt yuva420p -auto-alt-ref 0 ^
        "!OUTPUT!" >> "%LOG_FILE%" 2>&1

    if exist "!OUTPUT!" (
        echo ✅ Success: !OUTPUT!
        echo [OK] !OUTPUT! >> "%LOG_FILE%"
        set /a count+=1

        if /i "%AUTO_DELETE_MP4%"=="true" (
            del "!INPUT!.mp4"
            echo 🗑️ Deleted original: !INPUT!.mp4 >> "%LOG_FILE%"
        )

        if /i "%ENABLE_PREVIEW%"=="true" (
            start "" "!OUTPUT!"
        )
    ) else (
        echo ❌ Failed: !INPUT!.mp4
        echo [ERROR] !INPUT!.mp4 >> "%LOG_FILE%"
        set /a failed+=1
    )

    echo.
)

endlocal

:: ✅ Final Summary
echo 🏁 Conversion Complete!
echo 🔢 Total Successful: %count%
echo ❌ Total Failed: %failed%
echo 📁 Saved in: %CD%\%OUTPUT_DIR%\
echo 📄 Log file: %LOG_FILE%
echo.

pause
exit /b
