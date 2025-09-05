$sourceFolder = "$PSScriptRoot\ai-output"
$targetFolder = "$PSScriptRoot"

Get-ChildItem -Path $sourceFolder -Include *.mp4, *.mov, *.webm | ForEach-Object {
    $fileName = $_.BaseName
    $ext = $_.Extension
    $newName = "green_$fileName$ext"
    Copy-Item $_.FullName -Destination "$targetFolder\$newName" -Force
    Write-Host "📦 Prepared: $newName"
}

Write-Host "`n✅ All AI exports copied & renamed as green_* for processing."
