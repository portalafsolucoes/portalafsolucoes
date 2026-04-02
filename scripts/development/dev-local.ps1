# ========================================
# Script de Desenvolvimento LOCAL
# Branch: deploy-vercel-supabase (Supabase Cloud)
# ========================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AdwTech - DEV LOCAL + SUPABASE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar arquivo .env
Write-Host "[1/4] Verificando arquivo .env..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "ERRO: .env nao encontrado!" -ForegroundColor Red
    Write-Host "Copie .env.example para .env e configure as credenciais Supabase" -ForegroundColor Yellow
    pause
    exit 1
}

# Verificar se tem DATABASE_URL
$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "DATABASE_URL=") {
    Write-Host "ERRO: DATABASE_URL nao encontrado no .env!" -ForegroundColor Red
    Write-Host "Configure DATABASE_URL com a connection string do Supabase" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host "OK - .env configurado" -ForegroundColor Green
Write-Host ""

# 2. Limpar processos
Write-Host "[2/4] Limpando processos Node.js..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "OK" -ForegroundColor Green
Write-Host ""

# 3. Limpar cache
Write-Host "[3/4] Limpando cache Next.js..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

# 4. Gerar Prisma Client
Write-Host "[4/4] Gerando Prisma Client e testando conexao..." -ForegroundColor Yellow
try {
    npm run db:generate 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK - Prisma Client gerado e Supabase conectado" -ForegroundColor Green
    } else {
        Write-Host "AVISO: Problema ao gerar Prisma Client" -ForegroundColor Yellow
        Write-Host "Continuando mesmo assim..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERRO ao gerar Prisma Client: $_" -ForegroundColor Red
    Write-Host "Verifique as credenciais do Supabase no .env" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host ""

# Iniciar servidor
Write-Host "========================================" -ForegroundColor Green
Write-Host "  INICIANDO SERVIDOR..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Modo: Desenvolvimento Local" -ForegroundColor Cyan
Write-Host "Banco: Supabase Cloud (Connection Pooling)" -ForegroundColor Cyan
Write-Host "URL: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTA: Sistema rodando localmente mas conectado ao Supabase" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para parar: Ctrl+C ou .\parar-sistema.ps1" -ForegroundColor Yellow
Write-Host ""

# Executar npm run dev
npm run dev
