# PowerShell Script: convert_green_to_webm.ps1
# 🔁 Converts all .mp4 videos with green background to transparent .webm (SmartBiz)

Write-Host "🎬 Starting conversion of .mp4 videos with green screen to transparent .webm..." -ForegroundColor Cyan

# ✅ Check ffmpeg
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: ffmpeg is not installed or not in PATH." -ForegroundColor Red
    exit
}

# 📂 Define input/output folders relative to script location
$inputFolder = Resolve-Path "$PSScriptRoot\..\.."
$outputFolder = "$inputFolder\converted"

# 📁 Ensure output folder exists
if (!(Test-Path -Path $outputFolder)) {
    New-Item -ItemType Directory -Path $outputFolder | Out-Null
    Write-Host "📁 Created folder: $outputFolder" -ForegroundColor Yellow
}

# 🎞️ Get all .mp4 files
$videos = Get-ChildItem -Path $inputFolder -Filter *.mp4
if ($videos.Count -eq 0) {
    Write-Host "⚠️ No .mp4 videos found in: $inputFolder" -ForegroundColor DarkYellow
    exit
}

# 🔁 Convert loop
$convertedCount = 0
foreach ($video in $videos) {
    $inputFile = $video.FullName
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($video.Name)
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $outputFile = Join-Path $outputFolder "$fileName`_transparent_$timestamp.webm"

    Write-Host "🔄 Converting: $video.Name..." -ForegroundColor Gray

    # ✅ Run ffmpeg conversion (with fixes for transparency + libvpx)
    ffmpeg -y -i "$inputFile" -vf "colorkey=0x00FF00:0.3:0.2,format=yuva420p" `
        -c:v libvpx -auto-alt-ref 0 -pix_fmt yuva420p -b:v 1M "$outputFile"

    if (Test-Path "$outputFile") {
        Write-Host "✅ Done: $fileName → $($outputFile | Split-Path -Leaf)" -ForegroundColor Green
        $convertedCount++
    } else {
        Write-Host "❌ Failed to convert: $fileName" -ForegroundColor Red
    }
}

# ✅ Summary
Write-Host ""
Write-Host "🎉 Finished! Total converted: $convertedCount" -ForegroundColor Cyan
Write-Host "📂 Output folder: $outputFolder" -ForegroundColor Blue
