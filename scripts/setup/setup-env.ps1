# Script para criar arquivo .env.local automaticamente
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configurando Ambiente Local" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Criar arquivo .env.local
$envContent = @"
# ============================================
# CONFIGURAÇÃO PARA DESENVOLVIMENTO LOCAL
# ============================================

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

# CLOUDINARY (Opcional para local - deixe vazio se não configurado)
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# APP CONFIG
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
"@

Write-Host "1️⃣  Criando arquivo .env.local..." -ForegroundColor Yellow
$envContent | Out-File -FilePath ".env.local" -Encoding UTF8
Write-Host "✅ Arquivo .env.local criado!" -ForegroundColor Green
Write-Host ""

Write-Host "2️⃣  Testando conexão com Supabase..." -ForegroundColor Yellow
Write-Host "Aguarde..." -ForegroundColor Gray
Write-Host ""

# Executar teste de conexão
try {
    node test-db-connection.js
} catch {
    Write-Host "⚠️  Erro ao testar conexão. Execute manualmente: node test-db-connection.js" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Configuração Concluída!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Substitua [PROJECT-REF], [PASSWORD] e [REGION] pelas credenciais do seu projeto" -ForegroundColor White
Write-Host ""
Write-Host "2. Se o teste acima falhou, confira as variáveis e execute novamente:" -ForegroundColor White
Write-Host "   node test-db-connection.js" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Gere o Prisma Client:" -ForegroundColor White
Write-Host "   npm run db:generate" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Crie as tabelas (se necessário):" -ForegroundColor White
Write-Host "   npm run db:push" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Inicie o sistema:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""

