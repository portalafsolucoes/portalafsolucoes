# Script para parar completamente o sistema AdwTech
# Para TODOS os processos relacionados ao sistema

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  AdwTech - Parar Sistema" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Parando Job Next.js..." -ForegroundColor Yellow
$job = Get-Job -Name NextDevServer -ErrorAction SilentlyContinue
if ($job) {
    Stop-Job -Name NextDevServer -ErrorAction SilentlyContinue
    Remove-Job -Name NextDevServer -Force -ErrorAction SilentlyContinue
    Write-Host "OK Job parado" -ForegroundColor Green
} else {
    Write-Host "OK Nenhum job encontrado" -ForegroundColor Gray
}
Write-Host ""

Write-Host "Parando Node.js..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$nodeCheck = Get-Process -Name node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "OK Node.js parado completamente" -ForegroundColor Green
} else {
    Write-Host "AVISO: Alguns processos Node.js ainda rodando" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Parando ngrok..." -ForegroundColor Yellow
Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$ngrokCheck = Get-Process -Name ngrok -ErrorAction SilentlyContinue
if (-not $ngrokCheck) {
    Write-Host "OK ngrok parado completamente" -ForegroundColor Green
} else {
    Write-Host "AVISO: Alguns processos ngrok ainda rodando" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Parando PostgreSQL..." -ForegroundColor Yellow
$pgPath = "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe"
$pgDataPath = "C:\Program Files\PostgreSQL\16\data"

if (Test-Path $pgPath) {
    $pgStatus = & $pgPath status -D $pgDataPath 2>&1
    if ($pgStatus -notmatch "no server running") {
        & $pgPath stop -D $pgDataPath -m fast 2>&1 | Out-Null
        Start-Sleep -Seconds 3
        
        $pgStatusAfter = & $pgPath status -D $pgDataPath 2>&1
        if ($pgStatusAfter -match "no server running") {
            Write-Host "OK PostgreSQL parado completamente" -ForegroundColor Green
        } else {
            Write-Host "AVISO: PostgreSQL pode ainda estar rodando" -ForegroundColor Yellow
        }
    } else {
        Write-Host "OK PostgreSQL nao estava rodando" -ForegroundColor Gray
    }
    
    Get-Process -Name postgres -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "OK Processos PostgreSQL residuais eliminados" -ForegroundColor Green
} else {
    Write-Host "AVISO: PostgreSQL nao encontrado no caminho padrao" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Limpeza final..." -ForegroundColor Yellow

Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process -Name postgres -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2
Write-Host "OK Limpeza final concluida" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  SISTEMA PARADO COMPLETAMENTE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Para reiniciar o sistema, execute:" -ForegroundColor Yellow
Write-Host "  .\iniciar-sistema.ps1" -ForegroundColor White
Write-Host ""
Write-Host "Pressione qualquer tecla para fechar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
