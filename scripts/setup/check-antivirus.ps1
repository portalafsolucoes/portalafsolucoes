# Verificar o que está bloqueando a conexão

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Diagnóstico de Bloqueio" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar Antivírus
Write-Host "[1/5] Verificando Antivírus..." -ForegroundColor Yellow
$av = Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct -ErrorAction SilentlyContinue
if ($av) {
    foreach ($a in $av) {
        Write-Host "  - $($a.displayName)" -ForegroundColor White
    }
} else {
    Write-Host "  - Windows Defender" -ForegroundColor White
}
Write-Host ""

# 2. Verificar VPN
Write-Host "[2/5] Verificando VPN..." -ForegroundColor Yellow
$vpn = Get-VpnConnection -ErrorAction SilentlyContinue
if ($vpn) {
    Write-Host "  VPNs encontradas:" -ForegroundColor White
    $vpn | ForEach-Object { Write-Host "  - $($_.Name) (Status: $($_.ConnectionStatus))" -ForegroundColor White }
} else {
    Write-Host "  - Nenhuma VPN configurada" -ForegroundColor White
}
Write-Host ""

# 3. Verificar Proxy
Write-Host "[3/5] Verificando Proxy..." -ForegroundColor Yellow
$proxy = [System.Net.WebRequest]::GetSystemWebProxy()
$proxyUri = $proxy.GetProxy("http://www.google.com")
if ($proxyUri.Host -eq "www.google.com") {
    Write-Host "  - Sem proxy configurado" -ForegroundColor White
} else {
    Write-Host "  - Proxy detectado: $($proxyUri)" -ForegroundColor Yellow
}
Write-Host ""

# 4. Testar conectividade raw
Write-Host "[4/5] Testando conectividade TCP..." -ForegroundColor Yellow
$hosts = @(
    @{Host="aws-0-sa-east-1.pooler.supabase.com"; Port=6543},
    @{Host="aws-0-sa-east-1.pooler.supabase.com"; Port=5432},
    @{Host="google.com"; Port=443}
)

foreach ($h in $hosts) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.ReceiveTimeout = 3000
        $client.SendTimeout = 3000
        $result = $client.BeginConnect($h.Host, $h.Port, $null, $null)
        $success = $result.AsyncWaitHandle.WaitOne(3000)
        $client.Close()
        
        if ($success) {
            Write-Host "  ✅ $($h.Host):$($h.Port)" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $($h.Host):$($h.Port) - TIMEOUT" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ❌ $($h.Host):$($h.Port) - BLOQUEADO" -ForegroundColor Red
    }
}
Write-Host ""

# 5. Verificar regras de firewall criadas
Write-Host "[5/5] Verificando regras de firewall..." -ForegroundColor Yellow
$rules = netsh advfirewall firewall show rule name=all | Select-String "Supabase"
if ($rules) {
    Write-Host "  ✅ Regras Supabase encontradas" -ForegroundColor Green
} else {
    Write-Host "  ❌ Regras Supabase NÃO encontradas" -ForegroundColor Red
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Possíveis Bloqueadores" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se Google funciona mas Supabase não:" -ForegroundColor Yellow
Write-Host "  1. Antivírus pode estar bloqueando Node.js" -ForegroundColor White
Write-Host "  2. VPN pode estar restringindo portas" -ForegroundColor White
Write-Host "  3. Firewall corporativo (se for rede empresa)" -ForegroundColor White
Write-Host "  4. ISP pode estar bloqueando (raro)" -ForegroundColor White
Write-Host ""
Write-Host "SOLUÇÃO TEMPORÁRIA:" -ForegroundColor Green
Write-Host "  - Desabilite antivírus por 5 minutos e teste" -ForegroundColor White
Write-Host "  - OU adicione Node.js como exceção no antivírus" -ForegroundColor White
Write-Host "  - Caminho: C:\Program Files\nodejs\node.exe" -ForegroundColor White
Write-Host ""
pause
