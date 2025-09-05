# 📁 Tembea kwenye src/ na tafuta faili zote zenye .vue, .js, au .ts
$files = Get-ChildItem -Path ./src -Recurse -Include *.vue,*.js,*.ts -File

# 🔄 Kwa kila faili, badilisha mistari ya API_BASE au localhost usage
foreach ($file in $files) {
    (Get-Content $file.FullName) |
    ForEach-Object {
        $_ -replace "axios\.defaults\.baseURL\s*=\s*['""]http://localhost:8000['""]", "axios.defaults.baseURL = import.meta.env.VITE_API_BASE" `
           -replace "const\s+API_BASE\s*=\s*['""]http://localhost:8000['""]", "const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'" `
           -replace "const\s+API_BASE\s*=\s*import\.meta\.env\.VITE_API_BASE\s*\|\|\s*['""]http://localhost:8000['""]", "const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'" `
           -replace "['""]http://localhost:8000['""]", "import.meta.env.VITE_API_BASE || 'http://localhost:8000'"
    } | Set-Content $file.FullName
}

Write-Host "✅ All files have been updated with smart API_BASE logic!" -ForegroundColor Green
