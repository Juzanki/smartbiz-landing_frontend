# 📁 File Paths
$inputFolder = Get-Location
$outputFolder = "$inputFolder\output_transparent"
$logoPath = "$inputFolder\..\icons\smartbiz_logo.png"  # Corrected logo path
$jsonPath = "$inputFolder\giftList.json"

# ✅ Ensure output folder exists
if (-not (Test-Path $outputFolder)) {
    New-Item -ItemType Directory -Path $outputFolder | Out-Null
}

# 📄 Load giftList.json
$giftList = Get-Content $jsonPath | ConvertFrom-Json

# 🔁 Loop through each .mp4 video
Get-ChildItem -Path $inputFolder -Filter *.mp4 | ForEach-Object {
    $file = $_
    $fileName = $file.Name
    $inputPath = $file.FullName
    $outputPath = Join-Path $outputFolder ($file.BaseName + "_transparent.webm")

    # 🔎 Check if this video exists in giftList
    $gift = $giftList | Where-Object { $_.video -eq $fileName }

    if ($gift) {
        $coinValue = [int]$gift.coins
        if ($coinValue -ge 5000) {
            Write-Output "✅ Adding logo to $fileName (coins: $coinValue)"
            .\ffmpeg -y -i $inputPath -i $logoPath `
                -filter_complex "overlay=W-w-10:H-h-10" `
                -c:v libvpx -pix_fmt yuva420p -auto-alt-ref 0 $outputPath
        } else {
            Write-Output "⏩ Skipping logo for $fileName (coins: $coinValue)"
            .\ffmpeg -y -i $inputPath `
                -c:v libvpx -pix_fmt yuva420p -auto-alt-ref 0 $outputPath
        }
    } else {
        Write-Output "⚠️ $fileName not found in giftList.json. Skipping..."
    }
}
