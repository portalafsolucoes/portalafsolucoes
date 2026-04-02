# Script para configurar Cloudinary na Vercel
# Execute este script para adicionar as variáveis de ambiente

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Configurando Cloudinary na Vercel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Credenciais do Cloudinary
$CLOUD_NAME = "dgidslzgg"
$API_KEY = "227461488686687"
$API_SECRET = "UMAv_iVpj4LSDC1sOrKQJ9Hw_8Y"

Write-Host "Cloud Name: $CLOUD_NAME" -ForegroundColor Green
Write-Host "API Key: $API_KEY" -ForegroundColor Green
Write-Host "API Secret: $API_SECRET" -ForegroundColor Green
Write-Host ""

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
