# === PowerShell Script: PopulateVueComponents.ps1 ===
$componentsPath = "E:\SmartBiz_Assistance\smartbiz-landing\src\components"
$viewsPath = "E:\SmartBiz_Assistance\smartbiz-landing\src\views"

# ✅ Vue placeholder template
$vueTemplate = @"
<template>
  <div class="p-6">
    <h2 class="text-xl font-bold">🔧 [COMPONENT_NAME] is under construction...</h2>
    <p class="text-sm text-gray-500 mt-2">Please complete this component.</p>
  </div>
</template>

<script setup>
// TODO: Add logic for [COMPONENT_NAME]
</script>

<style scoped>
/* Basic style */
</style>
"@

# 📁 Component list
$vueFiles = @(
  "BottomNav.vue", "Sidebar.vue", "DashboardUser.vue", "DashboardCard.vue",
  "LiveRoom.vue", "GiftDrawer.vue", "GiftsPanel.vue", "LiveGiftAnimations.vue",
  "VoiceToggle.vue", "ScreenShareToggle.vue", "MyProfile.vue", "Followers.vue",
  "RechargeWalletView.vue", "WithdrawRequestView.vue", "SmartCoinWallet.vue",
  "SmartAssistant.vue", "SupportInboxView.vue", "HelpCenter.vue", "AuditLogHistory.vue"
)

# ✍️ Function: Write .vue file if missing
function Write-VueFile {
  param (
    [string]$directory,
    [string]$file
  )
  $filePath = Join-Path $directory $file
  if (-Not (Test-Path $filePath)) {
    $content = $vueTemplate -replace '\[COMPONENT_NAME\]', ($file -replace '.vue','')
    $content | Out-File -FilePath $filePath -Encoding UTF8
    Write-Host "✅ Created: $file in $directory"
  } else {
    Write-Host "✔️ Already exists: $file in $directory"
  }
}

# 🏗️ Generate COMPONENTS
Write-Host "`n🔧 Populating COMPONENTS folder:"
foreach ($file in $vueFiles) {
  Write-VueFile -directory $componentsPath -file $file
}

# 🏗️ Generate VIEWS
Write-Host "`n🔧 Populating VIEWS folder:"
foreach ($file in $vueFiles) {
  Write-VueFile -directory $viewsPath -file $file
}
