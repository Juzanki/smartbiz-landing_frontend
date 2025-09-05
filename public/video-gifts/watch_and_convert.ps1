$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = Get-Location
$watcher.Filter = "green_*.mp4"
$watcher.EnableRaisingEvents = $true
$watcher.IncludeSubdirectories = $false

Register-ObjectEvent $watcher Created -Action {
    Start-Sleep -Seconds 1
    $filePath = $Event.SourceEventArgs.FullPath
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($filePath)
    $outputFile = "$($watcher.Path)\transparent\$fileName.webm"
    if (-Not (Test-Path $outputFile)) {
        .\ffmpeg.exe -i "$filePath" `
        -vf "colorkey=0x00FF00:0.3:0.1,format=yuva420p" `
        -c:v libvpx-vp9 -auto-alt-ref 0 -b:v 1M -an "$outputFile"
        Write-Host "✅ Auto-Converted: $fileName.webm"
    }
}

Write-Host "👀 Watching for new green_*.mp4 files... Press Ctrl+C to stop."
while ($true) { Start-Sleep -Seconds 2 }
