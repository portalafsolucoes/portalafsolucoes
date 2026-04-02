# Script para adicionar NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME em todos os ambientes

Write-Host "Adicionando NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME..." -ForegroundColor Cyan

$cloudName = "dgidslzgg"

# Production
Write-Host "1/3 - Production..." -ForegroundColor Yellow
Write-Output $cloudName | vercel env add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME production

# Preview
Write-Host "2/3 - Preview..." -ForegroundColor Yellow
Write-Output $cloudName | vercel env add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME preview

# Development
Write-Host "3/3 - Development..." -ForegroundColor Yellow
Write-Output $cloudName | vercel env add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME development

Write-Host ""
Write-Host "Concluído! Fazendo redeploy..." -ForegroundColor Green
vercel --prod

Write-Host ""
Write-Host "Deploy iniciado!" -ForegroundColor Green
