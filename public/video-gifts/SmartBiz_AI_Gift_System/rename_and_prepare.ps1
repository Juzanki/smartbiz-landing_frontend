$src = "$PSScriptRoot\ai-output"
$dest = "$PSScriptRoot"
Get-ChildItem -Path $src -Include *.mp4, *.mov, *.webm | ForEach-Object {
    $name = $_.BaseName
    $ext = $_.Extension
    $new = "green_$name$ext"
    Copy-Item $_.FullName -Destination "$dest\$new" -Force
    Write-Host "ðŸ“¦ Prepared: $new"
}
Write-Host "`nâœ… All AI exports copied & renamed."
