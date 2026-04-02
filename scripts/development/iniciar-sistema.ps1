# Script para iniciar o sistema AdwTech

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AdwTech - Iniciar Sistema" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar .env
Write-Host "Verificando configuracao..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "ERRO: .env nao encontrado!" -ForegroundColor Red
    Write-Host "Configure o arquivo .env antes de iniciar" -ForegroundColor Yellow
    pause
    exit 1
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

# Limpar processos
Write-Host "Limpando processos Node.js..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "OK" -ForegroundColor Green
Write-Host ""

# Limpar cache Next.js (resolve erro Turbopack)
Write-Host "Limpando cache Next.js..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

# Prisma
Write-Host "Gerando Prisma Client..." -ForegroundColor Yellow
npm run db:generate | Out-Null
Write-Host "OK" -ForegroundColor Green
Write-Host ""

# Servidor
Write-Host "Iniciando servidor Next.js..." -ForegroundColor Yellow
Write-Host "O servidor sera executado no terminal integrado do Windsurf" -ForegroundColor Cyan
Write-Host ""

# Inicia o servidor em background no terminal atual
Start-Job -ScriptBlock {
    Set-Location $using:PWD
    npm run dev
} -Name "NextDevServer" | Out-Null

Write-Host "Aguardando servidor inicializar (25s)..." -ForegroundColor Yellow
Start-Sleep -Seconds 25

$ok = $false
for ($i=1; $i -le 6; $i++) {
    try {
        $null = Invoke-WebRequest -Uri http://localhost:3000 -TimeoutSec 2 -UseBasicParsing -ErrorAction Stop
        $ok = $true
        break
    } catch {
        Start-Sleep -Seconds 2
    }
}

Write-Host ""
if ($ok) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  SISTEMA FUNCIONANDO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Acesse: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Comandos uteis:" -ForegroundColor Yellow
    Write-Host "  Ver logs:       Get-Job -Name NextDevServer | Receive-Job" -ForegroundColor White
    Write-Host "  Acesso externo: .\iniciar-ngrok.ps1" -ForegroundColor White
    Write-Host "  Parar sistema:  .\parar-sistema.ps1" -ForegroundColor White
} else {
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "  AVISO: Servidor pode nao ter iniciado" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Verifique os logs com:" -ForegroundColor Yellow
    Write-Host "  Get-Job -Name NextDevServer | Receive-Job" -ForegroundColor White
}

Write-Host ""
Write-Host "Servidor esta rodando em background." -ForegroundColor Cyan
Write-Host "Para parar use: .\parar-sistema.ps1" -ForegroundColor Cyan
Write-Host ""
pause
