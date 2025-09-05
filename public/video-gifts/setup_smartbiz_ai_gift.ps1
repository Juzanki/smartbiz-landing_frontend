# 📁 Unda SmartBiz AI Gift System folder structure
$base = "$PSScriptRoot\SmartBiz_AI_Gift_System"
$folders = @("ai-ready", "ai-output", "transparent")

foreach ($folder in $folders) {
    $path = Join-Path $base $folder
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path | Out-Null
    }
}

# 📝 Andika remove_green.ps1
@'
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
        Write-Host "⏭️  Skipped: $fileName.webm"
    } else {
        .\ffmpeg.exe -i "$inputFile" `
            -vf "colorkey=0x00FF00:0.3:0.1,format=yuva420p" `
            -c:v libvpx-vp9 -auto-alt-ref 0 -b:v 1M -an "$outputFile"
        Write-Host "✅ Converted: $fileName"
    }
}
Write-Host "`n✅ All converted! Saved in: $outputFolder"
'@ | Out-File "$base\remove_green.ps1" -Encoding UTF8

# 🖱️ convert_green_to_webm.bat
@'
@echo off
cd /d %~dp0
powershell -ExecutionPolicy Bypass -File .\remove_green.ps1
pause
'@ | Out-File "$base\convert_green_to_webm.bat" -Encoding ASCII

# 👀 Watcher
@'
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
        Write-Host "✅ Auto-Processed: $name.webm"
    }
}
Write-Host "`n👀 Watching... Press Ctrl+C to stop."
while ($true) { Start-Sleep -Seconds 2 }
'@ | Out-File "$base\watch_and_convert.ps1" -Encoding UTF8

# 📦 rename_and_prepare.ps1
@'
$src = "$PSScriptRoot\ai-output"
$dest = "$PSScriptRoot"
Get-ChildItem -Path $src -Include *.mp4, *.mov, *.webm | ForEach-Object {
    $name = $_.BaseName
    $ext = $_.Extension
    $new = "green_$name$ext"
    Copy-Item $_.FullName -Destination "$dest\$new" -Force
    Write-Host "📦 Prepared: $new"
}
Write-Host "`n✅ All AI exports copied & renamed."
'@ | Out-File "$base\rename_and_prepare.ps1" -Encoding UTF8

# 🌐 preview_transparents.html
@'
<!DOCTYPE html>
<html>
<head>
  <title>SmartBiz Preview</title>
  <style>
    body { background: #000; color: white; font-family: sans-serif; padding: 1rem; }
    video { margin: 10px; max-width: 200px; border: 2px solid #fff; border-radius: 12px; }
  </style>
</head>
<body>
  <h2>🎁 Transparent Gift Preview</h2>
  <div id="gallery"></div>
  <script>
    const folder = "transparent/";
    const videos = ["sample1.webm", "sample2.webm"];
    const gallery = document.getElementById("gallery");
    videos.forEach(name => {
      const v = document.createElement("video");
      v.src = folder + name;
      v.controls = true;
      gallery.appendChild(v);
    });
  </script>
</body>
</html>
'@ | Out-File "$base\preview_transparents.html" -Encoding UTF8

# 📖 README file
@'
# 📦 SmartBiz AI Gift System

Tumia AI (RunwayML/Unscreen) kutengeneza green/transparent video za zawadi zako, kisha chakata kwa scripts hizi kuwa `.webm` tayari kwa matumizi ya SmartBiz LiveRoom.

## Folders:
- ai-ready/ → Video zako kabla ya AI
- ai-output/ → Matokeo ya RunwayML
- transparent/ → `.webm` final

## Scripts:
- rename_and_prepare.ps1
- remove_green.ps1
- convert_green_to_webm.bat
- watch_and_convert.ps1
- preview_transparents.html
'@ | Out-File "$base\README_SmartBiz_AIGift.md" -Encoding UTF8

Write-Host "`n🎉 SmartBiz AI Gift System ready at: $base" -ForegroundColor Green
