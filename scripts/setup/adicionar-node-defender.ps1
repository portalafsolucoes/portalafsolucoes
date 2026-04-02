# Adicionar Node.js como exceção no Windows Defender
# Execute como Administrador

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Adicionar Node.js ao Windows Defender" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está rodando como Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERRO: Este script precisa ser executado como Administrador!" -ForegroundColor Red
    pause
    exit 1
}

# Encontrar Node.js
$nodePaths = @(
    "C:\Program Files\nodejs\node.exe",
    "C:\Program Files (x86)\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
)

$nodeExe = $null
foreach ($path in $nodePaths) {
    if (Test-Path $path) {
        $nodeExe = $path
        break
    }
}

if (-not $nodeExe) {
    Write-Host "ERRO: Node.js não encontrado!" -ForegroundColor Red
    Write-Host "Execute: where.exe node" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Node.js encontrado em: $nodeExe" -ForegroundColor Green
Write-Host ""

Write-Host "Adicionando exceção no Windows Defender..." -ForegroundColor Yellow
try {
    Add-MpPreference -ExclusionProcess "node.exe"
    Write-Host "✅ Processo node.exe adicionado!" -ForegroundColor Green
    
    Add-MpPreference -ExclusionPath $nodeExe
    Write-Host "✅ Caminho $nodeExe adicionado!" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Exceção Criada com Sucesso!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Agora teste a conexão:" -ForegroundColor Yellow
    Write-Host "  node test-connection-v2.js" -ForegroundColor White
    Write-Host ""
    Write-Host "Se funcionar, inicie o servidor:" -ForegroundColor Yellow
    Write-Host "  .\dev-local.ps1" -ForegroundColor White
    Write-Host ""
} catch {
    Write-Host "ERRO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tente adicionar manualmente:" -ForegroundColor Yellow
    Write-Host "1. Abra 'Segurança do Windows'" -ForegroundColor White
    Write-Host "2. Proteção contra vírus e ameaças" -ForegroundColor White
    Write-Host "3. Gerenciar configurações" -ForegroundColor White
    Write-Host "4. Exclusões > Adicionar uma exclusão" -ForegroundColor White
    Write-Host "5. Processo > node.exe" -ForegroundColor White
    Write-Host ""
}

pause
