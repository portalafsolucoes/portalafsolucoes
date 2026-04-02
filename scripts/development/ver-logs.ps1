# Script para visualizar logs do servidor Next.js

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Logs do Servidor Next.js" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$job = Get-Job -Name NextDevServer -ErrorAction SilentlyContinue

if ($job) {
    Write-Host "Status do Job: $($job.State)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Logs:" -ForegroundColor Green
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    Receive-Job -Name NextDevServer -Keep
    
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Pressione Ctrl+C para parar de visualizar" -ForegroundColor Yellow
    Write-Host "Use .\parar-sistema.ps1 para parar o servidor" -ForegroundColor Yellow
} else {
    Write-Host "AVISO: Nenhum servidor rodando" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para iniciar o servidor, execute:" -ForegroundColor Yellow
    Write-Host "  .\iniciar-sistema.ps1" -ForegroundColor White
}

Write-Host ""
pause
