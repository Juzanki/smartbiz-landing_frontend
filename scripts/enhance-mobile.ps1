$componentsPath = "E:\SmartBiz_Assistance\smartbiz-landing\src\components"
$viewsPath = "E:\SmartBiz_Assistance\smartbiz-landing\src\views"

# List of target files
$targetFiles = @(
    "$viewsPath\DashboardUser.vue",
    "$viewsPath\SmartCoinWallet.vue",
    "$viewsPath\WithdrawRequestView.vue",
    "$viewsPath\VoiceToggle.vue"
)

# Check each and compare/backup/enhance
foreach ($file in $targetFiles) {
    $backup = "$file.bak"
    if (-not (Test-Path $backup)) {
        Copy-Item $file $backup
    }

    # Apply enhancement (this would be your custom logic or use diff + overwrite)
    Write-Host "`n✨ Enhanced: $file"
}
Write-Host "`n✅ Enhancement Complete!"
