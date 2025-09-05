# 📦 Ondoa green background kutoka video zote zilizo na 'green_' prefix
$inputFolder = Get-Location
$outputFolder = "$inputFolder\transparent"

# ✅ Hakikisha output folder lipo
if (-Not (Test-Path $outputFolder)) {
    New-Item -ItemType Directory -Path $outputFolder | Out-Null
}

# 🔁 Pitia kila video inayostahili
Get-ChildItem -Path $inputFolder -Include green_*.mp4, green_*.mov -Recurse | ForEach-Object {
    $inputFile = $_.FullName
    $fileName = $_.BaseName
    $outputFile = "$outputFolder\$fileName.webm"

    if (Test-Path $outputFile) {
        Write-Host "⏭️  Skipped (already exists): $fileName.webm"
    } else {
        try {
            Write-Host "🎬 Converting: $fileName..." -ForegroundColor Cyan
            .\ffmpeg.exe -i "$inputFile" `
                -vf "colorkey=0x00FF00:0.3:0.1,format=yuva420p" `
                -c:v libvpx-vp9 -auto-alt-ref 0 -b:v 1M -an "$outputFile"
            Write-Host "✅ Converted with transparency: $fileName.webm" -ForegroundColor Green
        } catch {
            Write-Host "❌ Error processing: $fileName" -ForegroundColor Red
        }
    }
}

Write-Host "`n🎉 All videos processed! Transparent versions saved in: $outputFolder" -ForegroundColor Yellow
