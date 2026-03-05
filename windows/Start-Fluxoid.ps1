# Fluxoid Windows Launcher
# Starts all required services and launches the app

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
$BinDir = Join-Path $ScriptDir "bin"
$DataDir = Join-Path $ScriptDir "data"
$LogDir = Join-Path $ScriptDir "logs"
$ConfigDir = Join-Path $RepoRoot "config"
$DistDir = Join-Path $RepoRoot "fluxer_app\dist"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DataDir "nats_jetstream") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DataDir "meilisearch") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $DataDir "valkey") | Out-Null

$CaddyExe   = Join-Path $BinDir "caddy.exe"
$NatsExe    = Join-Path $BinDir "nats-server.exe"
$ValkeyExe  = Join-Path $BinDir "valkey-server.exe"
$MeiliExe   = Join-Path $BinDir "meilisearch.exe"
$LivekitExe = Join-Path $BinDir "livekit-server.exe"
$GatewayExe = Join-Path $BinDir "fluxer_gateway\bin\fluxer_gateway.cmd"
$NodeExe    = Join-Path $BinDir "node\node.exe"
$PnpmExe    = Join-Path $BinDir "node\pnpm.cmd"

$MeiliKeyFile = Join-Path $ScriptDir "meilisearch_master_key"
$MeiliKey = if (Test-Path $MeiliKeyFile) { Get-Content $MeiliKeyFile -Raw } else { "" }

# Inject dist path into Caddyfile
$CaddyTemplate = Join-Path $RepoRoot "dev\Caddyfile.dev"
$CaddyTemp = Join-Path $LogDir "Caddyfile.tmp"
$DistPathEscaped = $DistDir -replace '\\', '/'
(Get-Content $CaddyTemplate -Raw) -replace 'FLUXER_DIST_PLACEHOLDER', $DistPathEscaped | Set-Content $CaddyTemp

$Jobs = @()

function Start-Service {
    param($Name, $Exe, $Args, $WorkDir = $RepoRoot, [hashtable]$Env = @{})
    Write-Host "  Starting $Name..."
    $LogFile = Join-Path $LogDir "$Name.log"
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $Exe
    $psi.Arguments = $Args
    $psi.WorkingDirectory = $WorkDir
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true
    foreach ($kv in $Env.GetEnumerator()) {
        $psi.EnvironmentVariables[$kv.Key] = $kv.Value
    }
    $proc = [System.Diagnostics.Process]::Start($psi)
    $logStream = [System.IO.File]::Open($LogFile, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::Read)
    $null = $proc.StandardOutput.BaseStream.CopyToAsync($logStream)
    $null = $proc.StandardError.BaseStream.CopyToAsync($logStream)
    return $proc
}

# Build frontend if needed
if (-not (Test-Path (Join-Path $DistDir "index.html"))) {
    Write-Host "Frontend dist not found, building (this may take a few minutes)..."
    $buildProc = Start-Process -FilePath $PnpmExe -ArgumentList "--filter fluxer_app build" -WorkingDirectory $RepoRoot -Wait -PassThru -NoNewWindow
    if ($buildProc.ExitCode -ne 0) { Write-Error "Frontend build failed."; exit 1 }
    Write-Host "Frontend build complete."
}

Write-Host "Starting services..."
$Jobs += Start-Service "valkey"          $ValkeyExe  "--bind 127.0.0.1 --port 6379"
$Jobs += Start-Service "nats_core"       $NatsExe    "-p 4222 -a 127.0.0.1"
$Jobs += Start-Service "nats_jetstream"  $NatsExe    "-p 4223 -js -sd `"$(Join-Path $DataDir 'nats_jetstream')`" -a 127.0.0.1"
$Jobs += Start-Service "meilisearch"     $MeiliExe   "--env development --master-key `"$MeiliKey`" --db-path `"$(Join-Path $DataDir 'meilisearch')`" --http-addr 127.0.0.1:7700" -Env @{MEILI_NO_ANALYTICS="true"}
$Jobs += Start-Service "livekit"         $LivekitExe "--config `"$(Join-Path $RepoRoot 'dev\livekit.yaml')`""
$Jobs += Start-Service "fluxer_gateway"  $GatewayExe "foreground" -WorkDir (Join-Path $RepoRoot "fluxer_gateway") -Env @{
    FLUXER_CONFIG                = Join-Path $ConfigDir "config.json"
    FLUXER_GATEWAY_NO_SHELL      = "1"
    LOGGER_LEVEL                 = "debug"
    FLUXER_GATEWAY_NODE_FLAG     = "-name"
    FLUXER_GATEWAY_NODE_NAME     = "fluxer_gateway@127.0.0.1"
}
$Jobs += Start-Service "fluxer_server"   $NodeExe    "." -WorkDir (Join-Path $RepoRoot "fluxer_server") -Env @{
    FLUXER_CONFIG = Join-Path $ConfigDir "config.json"
    NODE_ENV      = "development"
}
$Jobs += Start-Service "caddy"           $CaddyExe   "run --config `"$CaddyTemp`" --adapter caddyfile"

# Wait for Caddy
Write-Host "Waiting for Caddy..."
$timeout = 60; $elapsed = 0
while ($elapsed -lt $timeout) {
    try { if ((Invoke-WebRequest -Uri "http://localhost:48763/_caddy_health" -UseBasicParsing -TimeoutSec 2 -EA Stop).StatusCode -eq 200) { break } } catch {}
    Start-Sleep 1; $elapsed++
}

# Wait for backend
Write-Host "Waiting for backend..."
$elapsed = 0
while ($elapsed -lt $timeout) {
    try { if ((Invoke-WebRequest -Uri "http://localhost:48763/.well-known/fluxer" -UseBasicParsing -TimeoutSec 2 -EA Stop).StatusCode -eq 200) { break } } catch {}
    Start-Sleep 1; $elapsed++
}

Start-Sleep 3
Write-Host "All services ready. Launching Fluxoid..."

# Find the exe - check installed location first, then dist-electron for dev
$AppExe = $null

# When installed via NSIS, the exe is in the install dir (passed as env var or sibling)
$InstalledExe = Join-Path $ScriptDir "..\Fluxoid.exe"
if (Test-Path $InstalledExe) {
    $AppExe = Get-Item $InstalledExe
}

# Dev fallback - dist-electron
if (-not $AppExe) {
    $AppExe = Get-ChildItem -Path (Join-Path $RepoRoot "fluxer_desktop\dist-electron") -Filter "*.exe" -ErrorAction SilentlyContinue | Where-Object { $_.Name -notlike "*Setup*" } | Select-Object -First 1
}

if (-not $AppExe) { Write-Error "Fluxoid exe not found. Make sure the app is installed or built."; exit 1 }

Start-Process -FilePath $AppExe.FullName -Wait

Write-Host "Fluxoid closed. Shutting down services..."
foreach ($job in $Jobs) { try { $job.Kill($true) } catch {} }
Write-Host "Done."
