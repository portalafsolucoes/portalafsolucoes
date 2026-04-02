@echo off
echo ========================================
echo   Liberando Portas do Supabase
echo ========================================
echo.

:: Verificar se está rodando como Admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERRO: Execute como Administrador!
    echo.
    echo Clique com botao direito e escolha "Executar como administrador"
    pause
    exit /b 1
)

echo [1/3] Removendo regras antigas...
netsh advfirewall firewall delete rule name="Supabase-DB-5432" >nul 2>&1
netsh advfirewall firewall delete rule name="Supabase-Pooler-6543" >nul 2>&1
echo OK

echo [2/3] Criando regra para porta 5432...
netsh advfirewall firewall add rule name="Supabase-DB-5432" dir=out action=allow protocol=TCP remoteport=5432
echo OK

echo [3/3] Criando regra para porta 6543...
netsh advfirewall firewall add rule name="Supabase-Pooler-6543" dir=out action=allow protocol=TCP remoteport=6543
echo OK

echo.
echo ========================================
echo   Portas Liberadas com Sucesso!
echo ========================================
echo.
echo Agora feche o servidor (Ctrl+C) e execute novamente:
echo   .\dev-local.ps1
echo.
pause
