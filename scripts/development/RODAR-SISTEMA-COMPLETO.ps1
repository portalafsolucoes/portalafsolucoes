# ========================================
# SCRIPT COMPLETO - CONFIGURAR E RODAR SISTEMA
# ========================================

param(
    [switch]$SkipTest = $false
)

$ErrorActionPreference = "Continue"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  CONFIGURAÇÃO E INICIALIZAÇÃO" -ForegroundColor Cyan
Write-Host "  AdwTech + Supabase" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Criar .env.local
Write-Host "1️⃣  Criando arquivo .env.local..." -ForegroundColor Yellow
$envContent = @"
# DATABASE - Supabase
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:5432/postgres"

# SUPABASE API
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""

# AUTHENTICATION
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="gere-um-secret-forte-antes-de-usar"

# CLOUDINARY (Opcional)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# APP CONFIG
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
"@

$envContent | Out-File -FilePath ".env.local" -Encoding UTF8 -Force
Write-Host "✅ Arquivo .env.local criado!" -ForegroundColor Green
Write-Host ""

# 2. Limpar cache Next.js
Write-Host "2️⃣  Limpando cache Next.js..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "✅ Cache limpo!" -ForegroundColor Green
Write-Host ""

# 3. Verificar Supabase
if (-not $SkipTest) {
    Write-Host "3️⃣  Testando conexão com Supabase..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE: Confira se as credenciais em .env.local foram substituídas antes do teste" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Aguarde..." -ForegroundColor Gray
    Write-Host ""
    
    try {
        node test-db-connection.js
        $conexaoOk = $true
    } catch {
        $conexaoOk = $false
        Write-Host "⚠️  Erro ao testar conexão" -ForegroundColor Yellow
        Write-Host "Continuando mesmo assim..." -ForegroundColor Gray
    }
    Write-Host ""
} else {
    Write-Host "3️⃣  Teste de conexão pulado" -ForegroundColor Gray
    Write-Host ""
}

# 4. Gerar Prisma Client
Write-Host "4️⃣  Gerando Prisma Client..." -ForegroundColor Yellow
try {
    npx --yes prisma generate | Out-Null
    Write-Host "✅ Prisma Client gerado!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Erro ao gerar Prisma Client" -ForegroundColor Yellow
}
Write-Host ""

# 5. Perguntar sobre tabelas
Write-Host "5️⃣  Configuração do banco de dados" -ForegroundColor Yellow
Write-Host ""
$response = Read-Host "Deseja criar/atualizar tabelas no Supabase? (S/N)"
if ($response -eq "S" -or $response -eq "s" -or $response -eq "sim" -or $response -eq "yes") {
    Write-Host ""
    Write-Host "Criando tabelas..." -ForegroundColor Yellow
    try {
        npx --yes prisma db push
        Write-Host "✅ Tabelas criadas/atualizadas!" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Erro ao criar tabelas" -ForegroundColor Yellow
        Write-Host "Tente executar manualmente: npx prisma db push" -ForegroundColor Gray
    }
} else {
    Write-Host "⏭️  Pulando criação de tabelas" -ForegroundColor Gray
}
Write-Host ""

# 6. Finalizar
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✅ CONFIGURAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Sistema configurado com sucesso!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Confirme que .env.local está com as credenciais corretas do Supabase" -ForegroundColor White
Write-Host ""
Write-Host "2. Inicie o servidor de desenvolvimento:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Acesse o sistema:" -ForegroundColor White
Write-Host "   http://localhost:3000" -ForegroundColor Gray
Write-Host ""

# 7. Perguntar se deseja iniciar
$iniciar = Read-Host "Deseja iniciar o servidor agora? (S/N)"
if ($iniciar -eq "S" -or $iniciar -eq "s") {
    Write-Host ""
    Write-Host "🚀 Iniciando servidor..." -ForegroundColor Cyan
    Write-Host ""
    npm run dev
} else {
    Write-Host ""
    Write-Host "Para iniciar manualmente, execute:" -ForegroundColor Cyan
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
}

