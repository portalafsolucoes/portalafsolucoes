# Script para abrir portas do Supabase no Firewall do Windows
# Execute como Administrador

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configurar Firewall para Supabase" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está rodando como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERRO: Este script precisa ser executado como Administrador!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Clique com botao direito no PowerShell e escolha 'Executar como Administrador'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Criando regras de firewall..." -ForegroundColor Yellow
Write-Host ""

# Remover regras antigas se existirem
Remove-NetFirewallRule -DisplayName "Supabase-DB-5432" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Supabase-Pooler-6543" -ErrorAction SilentlyContinue

# Criar regra para porta 5432 (conexão direta)
Write-Host "[1/2] Porta 5432 (Conexao Direta)..." -ForegroundColor Cyan
New-NetFirewallRule `
    -DisplayName "Supabase-DB-5432" `
    -Direction Outbound `
    -Protocol TCP `
    -RemotePort 5432 `
    -Action Allow `
    -Profile Any `
    | Out-Null
Write-Host "OK" -ForegroundColor Green

# Criar regra para porta 6543 (pooler)
Write-Host "[2/2] Porta 6543 (Connection Pooler)..." -ForegroundColor Cyan
New-NetFirewallRule `
    -DisplayName "Supabase-Pooler-6543" `
    -Direction Outbound `
    -Protocol TCP `
    -RemotePort 6543 `
    -Action Allow `
    -Profile Any `
    | Out-Null
Write-Host "OK" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Firewall Configurado!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Portas liberadas:" -ForegroundColor Cyan
Write-Host "  - 5432 (Conexao Direta PostgreSQL)" -ForegroundColor White
Write-Host "  - 6543 (Supabase Connection Pooler)" -ForegroundColor White
Write-Host ""
Write-Host "Agora tente conectar novamente:" -ForegroundColor Yellow
Write-Host "  node test-connection-v2.js" -ForegroundColor White
Write-Host ""
pause
