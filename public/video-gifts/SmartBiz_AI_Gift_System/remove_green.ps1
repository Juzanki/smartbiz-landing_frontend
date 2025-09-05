$inputFolder = Get-Location
$outputFolder = "$inputFolder\transparent"
if (-Not (Test-Path $outputFolder)) {
    New-Item -ItemType Directory -Path $outputFolder | Out-Null
}
Get-ChildItem -Path $inputFolder -Include green_*.mp4, green_*.mov -Recurse | ForEach-Object {
    $inputFile = $_.FullName
    $fileName = $_.BaseName
    $outputFile = "$outputFolder\$fileName.webm"
    if (Test-Path $outputFile) {
        Write-Host "â­ï¸  Skipped: $fileName.webm"
    } else {
        .\ffmpeg.exe -i "$inputFile" `
            -vf "colorkey=0x00FF00:0.3:0.1,format=yuva420p" `
            -c:v libvpx-vp9 -auto-alt-ref 0 -b:v 1M -an "$outputFile"
        Write-Host "âœ… Converted: $fileName"
    }
}
Write-Host "`nâœ… All converted! Saved in: $outputFolder"
