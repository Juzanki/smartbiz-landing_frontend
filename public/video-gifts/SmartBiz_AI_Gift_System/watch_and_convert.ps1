$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = Get-Location
$watcher.Filter = "green_*.mp4"
$watcher.EnableRaisingEvents = $true
Register-ObjectEvent $watcher Created -Action {
    Start-Sleep -Seconds 1
    $file = $Event.SourceEventArgs.FullPath
    $name = [System.IO.Path]::GetFileNameWithoutExtension($file)
    $out = "$($watcher.Path)\transparent\$name.webm"
    if (-Not (Test-Path $out)) {
        .\ffmpeg.exe -i "$file" `
        -vf "colorkey=0x00FF00:0.3:0.1,format=yuva420p" `
        -c:v libvpx-vp9 -auto-alt-ref 0 -b:v 1M -an "$out"
        Write-Host "âœ… Auto-Processed: $name.webm"
    }
}
Write-Host "`nðŸ‘€ Watching... Press Ctrl+C to stop."
while ($true) { Start-Sleep -Seconds 2 }
