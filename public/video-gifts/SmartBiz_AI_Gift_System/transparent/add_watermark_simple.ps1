# ➕ Weka watermark ya maandishi 'SmartBiz' kwenye kila .webm

$inputFolder = Get-Location
$outputFolder = "$inputFolder\watermarked"

if (-not (Test-Path $outputFolder)) {
    New-Item -ItemType Directory -Path $outputFolder | Out-Null
}

Get-ChildItem -Path $inputFolder -Include *.webm -File | ForEach-Object {
    $inputFile = $_.FullName
    $fileName = $_.BaseName
    $outputFile = "$outputFolder\$fileName`_wm.webm"

    .\ffmpeg.exe -i "$inputFile" `
        -vf "drawtext=text='SmartBiz':fontcolor=white@0.85:fontsize=24:x=w-tw-20:y=h-th-20" `
        -c:v libvpx-vp9 -auto-alt-ref 0 -b:v 1M -an "$outputFile"

    Write-Host "✅ Watermarked: $fileName"
}

Write-Host "`n🎉 All .webm gifts watermarked and saved to: $outputFolder"
