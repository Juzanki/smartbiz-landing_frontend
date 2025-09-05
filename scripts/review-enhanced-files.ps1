# === Script: review-enhanced-files.ps1 ===
# Hufanya ukaguzi wa .vue vs .vue.bak na kuruhusu urejeshe au ubaki na mpya

$folders = @(
  "E:\SmartBiz_Assistance\smartbiz-landing\src\components",
  "E:\SmartBiz_Assistance\smartbiz-landing\src\views"
)

foreach ($folder in $folders) {
  Write-Host "`n📂 Checking: $folder"

  Get-ChildItem -Path $folder -Filter "*.vue.bak" | ForEach-Object {
    $bakFile = $_.FullName
    $originalFile = $bakFile -replace '\.bak$', ''

    if (Test-Path $originalFile) {
      $bakContent = Get-Content $bakFile -Raw
      $origContent = Get-Content $originalFile -Raw

      if ($bakContent -ne $origContent) {
        $fileName = $_.BaseName -replace '\.vue', ''
        Write-Host "`n📝 DIFFERENCE FOUND: $fileName"
        Write-Host "   [1] Keep ENHANCED version"
        Write-Host "   [2] RESTORE backup (.bak)"
        Write-Host "   [3] SKIP"
        $choice = Read-Host "👉 Choose [1-3]"

        switch ($choice) {
          "2" {
            Copy-Item $bakFile $originalFile -Force
            Write-Host "✅ Restored from backup: $originalFile"
          }
          "1" {
            Write-Host "✅ Keeping enhanced version: $originalFile"
          }
          default {
            Write-Host "⏭️ Skipped: $originalFile"
          }
        }
      } else {
        Write-Host "✅ No changes for: $($_.BaseName -replace '\.vue', '')"
      }
    }
  }
}

Write-Host "`n✅ Done reviewing enhanced files!"
