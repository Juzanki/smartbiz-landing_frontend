# === CONFIG ===
$AppVuePath = "src\App.vue"
$ProjectRoot = Resolve-Path ".."
$FullAppVue = Join-Path $ProjectRoot $AppVuePath

# === CHECK EXISTENCE ===
if (-Not (Test-Path $FullAppVue)) {
    Write-Host "❌ App.vue not found at: $FullAppVue"
    exit
}

# === LOAD CONTENT ===
$content = Get-Content $FullAppVue -Raw

# === 1. Inject Import if not present ===
if ($content -notmatch "import BottomNav") {
    $content = $content -replace "(?s)(<script setup>[\r\n]+)", "`$1import BottomNav from '@/components/BottomNav.vue'`n"
    Write-Host "✅ Added import for BottomNav"
}

# === 2. Add isMobile logic if not present ===
if ($content -notmatch "const isMobile") {
    $inject = @"
const isMobile = ref(false)
function checkSize() {
  isMobile.value = window.innerWidth <= 768
}
onMounted(() => {
  checkSize()
  window.addEventListener('resize', checkSize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', checkSize)
})
"@

    $content = $content -replace "(?s)(<script setup>.*?\n)", "`$1$inject`n"
    Write-Host "✅ Added isMobile detection logic"
}

# === 3. Inject BottomNav into <template> if not present ===
if ($content -notmatch "<BottomNav") {
    $content = $content -replace "(?s)(<main[^>]*>.*?)(</main>)", "`$1`n  <BottomNav v-if=`"isMobile`" class=`"fixed bottom-0 left-0 w-full z-50`" />`n`$2"
    Write-Host "✅ Injected <BottomNav /> into <template>"
}

# === SAVE CHANGES ===
Set-Content $FullAppVue $content -Force
Write-Host "🎉 Done updating App.vue with BottomNav logic!"
