# Script para migrar imports de Prisma para Supabase em todos os arquivos
$files = Get-ChildItem -Path "src\app\api" -Filter "*.ts" -Recurse

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    if ($content -match "from '@/lib/prisma'") {
        Write-Host "Migrando: $($file.FullName)"
        $newContent = $content -replace "from '@/lib/prisma'", "from '@/lib/supabase'"
        $newContent = $newContent -replace "import { prisma }", "import { supabase }"
        $newContent = $newContent -replace "import { prisma,", "import { supabase,"
        
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        $count++
    }
}

Write-Host "`nTotal de arquivos migrados: $count"
Write-Host "✅ Imports atualizados! Agora as queries precisam ser convertidas manualmente."
