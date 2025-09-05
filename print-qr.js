import qrcode from 'qrcode-terminal'
import os from 'os'

function getLocalIP() {
  const interfaces = os.networkInterfaces()
  for (const iface of Object.values(interfaces)) {
    for (const config of iface) {
      if (config.family === 'IPv4' && !config.internal) {
        return config.address
      }
    }
  }
  return 'localhost'
}

const ip = getLocalIP()
const port = 5173
const url = `http://${ip}:${port}`

// ✅ Scan Instructions with shorter display duration
console.log('\n🔗 Scan this QR Code to preview your app on mobile (valid for 30 seconds):\n')
qrcode.generate(url, { small: true })
console.log(`\n🌐 URL: ${url}\n`)

// 🕒 QR code timeout: 30 seconds = 30,000ms
setTimeout(() => {
  console.log('\n⏰ QR code display timed out after 30 seconds. Exiting...\n')
  process.exit(0)
}, 30 * 1000)  // 30 seconds
