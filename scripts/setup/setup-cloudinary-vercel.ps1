# Script para configurar Cloudinary na Vercel
# Execute este script para adicionar as variáveis de ambiente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configurando Cloudinary na Vercel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Credenciais lidas de variaveis de ambiente (nunca hardcode)
$CLOUD_NAME = $env:NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
$API_KEY = $env:CLOUDINARY_API_KEY
$API_SECRET = $env:CLOUDINARY_API_SECRET

if (-not $CLOUD_NAME -or -not $API_KEY -or -not $API_SECRET) {
    Write-Host "ERRO: Configure as variaveis de ambiente antes de executar:" -ForegroundColor Red
    Write-Host "  set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=seu_cloud_name" -ForegroundColor Yellow
    Write-Host "  set CLOUDINARY_API_KEY=sua_api_key" -ForegroundColor Yellow
    Write-Host "  set CLOUDINARY_API_SECRET=seu_api_secret" -ForegroundColor Yellow
    exit 1
}

Write-Host "Adicionando variáveis na Vercel..." -ForegroundColor Yellow
Write-Host ""

# Adicionar NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
Write-Host "1/3 - Adicionando NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME..." -ForegroundColor Cyan
echo $CLOUD_NAME | vercel env add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME production

# Adicionar CLOUDINARY_API_KEY
Write-Host "2/3 - Adicionando CLOUDINARY_API_KEY..." -ForegroundColor Cyan
echo $API_KEY | vercel env add CLOUDINARY_API_KEY production

# Adicionar CLOUDINARY_API_SECRET
Write-Host "3/3 - Adicionando CLOUDINARY_API_SECRET..." -ForegroundColor Cyan
echo $API_SECRET | vercel env add CLOUDINARY_API_SECRET production

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Variáveis configuradas com sucesso!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Próximo passo: Fazer redeploy" -ForegroundColor Yellow
Write-Host "Execute: vercel --prod" -ForegroundColor White
Write-Host ""
