# 📦 Add text watermark "SmartBiz" to all .webm gifts with coins >= 5000

$inputFolder = Get-Location
$outputFolder = "$inputFolder\watermarked"

# Hakikisha folder la matokeo lipo
if (-not (Test-Path $outputFolder)) {
    New-Item -ItemType Directory -Path $outputFolder | Out-Null
}

# Soma giftList.js (assume iko nje ya folder hili)
$giftListPath = "$inputFolder\..\..\..\data\giftList.js"
$giftData = Get-Content $giftListPath -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue

if (-not $giftData) {
    Write-Host "⚠️ giftList.js not parsed. Please process manually."
} else {
    foreach ($gift in $giftData) {
        if ($gift.coins -ge 5000 -and $gift.video -like "*.webm") {
            $videoPath = "$inputFolder\$($gift.id)_transparent.webm"
            if (Test-Path $videoPath) {
                $outputPath = "$outputFolder\$($gift.id)_wm.webm"

                .\ffmpeg.exe -i "$videoPath" `
                  -vf "drawtext=text='SmartBiz':fontcolor=white@0.85:fontsize=24:x=w-tw-20:y=h-th-20" `
                  -c:v libvpx-vp9 -auto-alt-ref 0 -b:v 1M -an "$outputPath"

                Write-Host "✅ Watermarked: $($gift.id)"
            }
        }
    }
}

Write-Host "`n🎉 Finished watermarking. All saved to: $outputFolder"
