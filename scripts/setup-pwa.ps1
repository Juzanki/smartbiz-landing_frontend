# === CONFIG ===
$ProjectRoot = Resolve-Path ".."
$ManifestPath = Join-Path $ProjectRoot "public\manifest.webmanifest"
$SWPath = Join-Path $ProjectRoot "src\registerServiceWorker.js"
$MainJsPath = Join-Path $ProjectRoot "src\main.js"
$ViteConfig = Join-Path $ProjectRoot "vite.config.js"

# === 1. Create manifest.webmanifest ===
$manifestContent = @"
{
  "name": "SmartBiz Assistance",
  "short_name": "SmartBiz",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#FFD600",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
"@
Set-Content $ManifestPath $manifestContent -Force
Write-Host "✅ Created manifest.webmanifest"

# === 2. Create registerServiceWorker.js ===
$swContent = @"
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(() => {
      console.log('✅ Service Worker registered')
    }).catch(err => {
      console.warn('❌ Service Worker registration failed:', err)
    })
  })
}
"@
Set-Content $SWPath $swContent -Force
Write-Host "✅ Created registerServiceWorker.js"

# === 3. Inject to main.js if not present ===
if (Test-Path $MainJsPath) {
    $mainJs = Get-Content $MainJsPath -Raw
    if ($mainJs -notmatch "registerServiceWorker") {
        Add-Content $MainJsPath "`nimport './registerServiceWorker'"
        Write-Host "✅ Injected service worker import into main.js"
    }
}

# === 4. Update vite.config.js for vite-plugin-pwa ===
if ((Get-Content $ViteConfig) -notmatch "vite-plugin-pwa") {
    $viteInject = @"
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SmartBiz Assistance',
        short_name: 'SmartBiz',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#FFD600',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
"@
    Set-Content $ViteConfig $viteInject -Force
    Write-Host "✅ Overwrote vite.config.js with PWA plugin setup"
} else {
    Write-Host "ℹ️ vite.config.js already has PWA setup"
}

Write-Host "🎉 Done setting up PWA support!"
