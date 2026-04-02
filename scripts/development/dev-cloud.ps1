# ========================================
# Script de Desenvolvimento CLOUD
# Branch: deploy-vercel-supabase
# ========================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "  AdwTech - AMBIENTE CLOUD" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host ""

# 1. Verificar branch atual
Write-Host "[1/6] Verificando branch Git..." -ForegroundColor Yellow
$currentBranch = git branch --show-current

if ($currentBranch -ne "deploy-vercel-supabase") {
    Write-Host "Branch atual: $currentBranch" -ForegroundColor Red
    Write-Host "Mudando para branch 'deploy-vercel-supabase'..." -ForegroundColor Yellow

    # Verificar se há alterações não commitadas
    $status = git status --porcelain
    if ($status) {
        Write-Host ""
        Write-Host "AVISO: Voce tem alteracoes nao commitadas!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Opcoes:" -ForegroundColor Yellow
        Write-Host "  1. Commitar agora (recomendado)" -ForegroundColor White
        Write-Host "  2. Descartar alteracoes (CUIDADO!)" -ForegroundColor White
        Write-Host "  3. Cancelar e commitar manualmente" -ForegroundColor White
        Write-Host ""

        $choice = Read-Host "Escolha (1/2/3)"

        switch ($choice) {
            "1" {
                Write-Host "Commitando alteracoes..." -ForegroundColor Yellow
                git add .
                $message = Read-Host "Mensagem do commit"
                git commit -m $message
                Write-Host "OK" -ForegroundColor Green
            }
            "2" {
                Write-Host "Descartando alteracoes..." -ForegroundColor Red
                git checkout -- .
                Write-Host "OK" -ForegroundColor Green
            }
            "3" {
                Write-Host "Cancelando... Commit suas alteracoes e execute novamente." -ForegroundColor Yellow
                pause
                exit 0
            }
            default {
                Write-Host "Opcao invalida. Cancelando." -ForegroundColor Red
                pause
                exit 1
            }
        }
    }

    git checkout deploy-vercel-supabase
    Write-Host "OK - Branch: deploy-vercel-supabase" -ForegroundColor Green
} else {
    Write-Host "OK - Branch: deploy-vercel-supabase" -ForegroundColor Green
}
Write-Host ""

# 2. Verificar .env
Write-Host "[2/6] Verificando arquivo .env..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "AVISO: .env nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para desenvolvimento cloud, voce precisa configurar o Supabase." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opcoes:" -ForegroundColor Cyan
    Write-Host "  1. Usar .env.vercel.example como template" -ForegroundColor White
    Write-Host "  2. Cancelar e configurar manualmente" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "Escolha (1/2)"

    if ($choice -eq "1") {
        if (Test-Path ".env.vercel.example") {
            Copy-Item ".env.vercel.example" ".env"
            Write-Host ""
            Write-Host "IMPORTANTE: Edite o arquivo .env com credenciais Supabase!" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Passos:" -ForegroundColor Cyan
            Write-Host "  1. Acesse: https://supabase.com" -ForegroundColor White
            Write-Host "  2. Crie um projeto (ou use existente)" -ForegroundColor White
            Write-Host "  3. Settings > Database > Connection String" -ForegroundColor White
            Write-Host "  4. Copie 'Transaction' para DATABASE_URL" -ForegroundColor White
            Write-Host "  5. Copie 'Session' para DIRECT_URL" -ForegroundColor White
            Write-Host "  6. Edite .env com essas credenciais" -ForegroundColor White
            Write-Host ""
            Write-Host "Pressione qualquer tecla apos configurar..." -ForegroundColor Yellow
            pause
        } else {
            Write-Host "ERRO: .env.vercel.example nao encontrado!" -ForegroundColor Red
            pause
            exit 1
        }
    } else {
        Write-Host "Cancelando... Configure .env e execute novamente." -ForegroundColor Yellow
        pause
        exit 0
    }
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

# 3. Limpar processos
Write-Host "[3/6] Limpando processos Node.js..." -ForegroundColor Yellow
Get-Process -Name node,ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Write-Host "OK" -ForegroundColor Green
Write-Host ""

# 4. Limpar cache
Write-Host "[4/6] Limpando cache Next.js..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "OK" -ForegroundColor Green
Write-Host ""

# 5. Verificar conexão Supabase
Write-Host "[5/6] Verificando conexao Supabase..." -ForegroundColor Yellow
Write-Host "Testando conexao com banco..." -ForegroundColor Cyan

try {
    $testResult = npm run db:generate 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK - Supabase conectado" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "AVISO: Problema ao conectar com Supabase!" -ForegroundColor Yellow
        Write-Host "Verifique as credenciais em .env" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Deseja continuar mesmo assim? (s/n)" -ForegroundColor Yellow
        $continue = Read-Host

        if ($continue -ne "s") {
            Write-Host "Cancelando..." -ForegroundColor Red
            pause
            exit 1
        }
    }
} catch {
    Write-Host "ERRO ao gerar Prisma Client: $_" -ForegroundColor Red
    pause
    exit 1
}
Write-Host ""

# 6. Sincronizar com master (opcional)
Write-Host "[6/6] Sincronizar com branch master?" -ForegroundColor Yellow
Write-Host "Isso vai trazer as ultimas alteracoes da master para cloud" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opcoes:" -ForegroundColor Cyan
Write-Host "  1. SIM - Fazer merge de master (recomendado se houve mudancas)" -ForegroundColor White
Write-Host "  2. NAO - Continuar sem sincronizar" -ForegroundColor White
Write-Host ""

$syncChoice = Read-Host "Escolha (1/2)"

if ($syncChoice -eq "1") {
    Write-Host "Fazendo merge de master..." -ForegroundColor Yellow

    # Salvar branch atual
    $currentBranch = git branch --show-current

    # Fazer merge
    git merge master

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "CONFLITOS detectados no merge!" -ForegroundColor Red
        Write-Host "Resolva os conflitos manualmente e depois:" -ForegroundColor Yellow
        Write-Host "  git add ." -ForegroundColor White
        Write-Host "  git commit -m 'chore: merge master'" -ForegroundColor White
        Write-Host "  .\dev-cloud.ps1" -ForegroundColor White
        Write-Host ""
        pause
        exit 1
    }

    Write-Host "OK - Merge concluido" -ForegroundColor Green
} else {
    Write-Host "OK - Continuando sem sync" -ForegroundColor Green
}
Write-Host ""

# Iniciar servidor
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Iniciando servidor CLOUD..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Branch: deploy-vercel-supabase" -ForegroundColor Magenta
Write-Host "Banco: Supabase (Cloud)" -ForegroundColor Magenta
Write-Host "URL: http://localhost:3000" -ForegroundColor Magenta
Write-Host ""
Write-Host "NOTA: Este ambiente simula o deploy Vercel localmente" -ForegroundColor Cyan
Write-Host "Para deploy real, use: vercel deploy" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para parar: Ctrl+C ou .\parar-sistema.ps1" -ForegroundColor Yellow
Write-Host ""

# Executar npm run dev
npm run dev
