# Run this script once on Windows to download all required binaries
# Run as: powershell -ExecutionPolicy Bypass -File Download-Deps.ps1

$BinDir = Join-Path $PSScriptRoot "bin"
New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $BinDir "node") | Out-Null

function Download-Binary {
    param($Name, $Url, $OutPath)
    Write-Host "Downloading $Name..."
    Invoke-WebRequest -Uri $Url -OutFile $OutPath -UseBasicParsing
    Write-Host "  Done: $OutPath"
}

function Download-ZipExtract {
    param($Name, $Url, $ExtractTo, $FileFilter = "*")
    Write-Host "Downloading $Name..."
    $tmp = Join-Path $env:TEMP "$Name.zip"
    Invoke-WebRequest -Uri $Url -OutFile $tmp -UseBasicParsing
    Expand-Archive -Path $tmp -DestinationPath $ExtractTo -Force
    Remove-Item $tmp
    Write-Host "  Done: $ExtractTo"
}

# Caddy
Download-Binary "Caddy" "https://github.com/caddyserver/caddy/releases/latest/download/caddy_windows_amd64.zip" (Join-Path $env:TEMP "caddy.zip")
Expand-Archive -Path (Join-Path $env:TEMP "caddy.zip") -DestinationPath $BinDir -Force
Remove-Item (Join-Path $env:TEMP "caddy.zip")

# NATS
Download-ZipExtract "NATS" "https://github.com/nats-io/nats-server/releases/latest/download/nats-server-v2-windows-amd64.zip" $env:TEMP
$natsExe = Get-ChildItem -Path $env:TEMP -Filter "nats-server.exe" -Recurse | Select-Object -First 1
Copy-Item $natsExe.FullName (Join-Path $BinDir "nats-server.exe")

# Meilisearch
Download-Binary "Meilisearch" "https://github.com/meilisearch/meilisearch/releases/latest/download/meilisearch-windows-amd64.exe" (Join-Path $BinDir "meilisearch.exe")

# LiveKit
Download-ZipExtract "LiveKit" "https://github.com/livekit/livekit/releases/latest/download/livekit_windows_amd64.zip" $env:TEMP
$livekitExe = Get-ChildItem -Path $env:TEMP -Filter "livekit-server.exe" -Recurse | Select-Object -First 1
Copy-Item $livekitExe.FullName (Join-Path $BinDir "livekit-server.exe")

# Node.js (portable)
Write-Host "Downloading Node.js..."
$nodeUrl = "https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip"
$nodeTmp = Join-Path $env:TEMP "node.zip"
Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeTmp -UseBasicParsing
Expand-Archive -Path $nodeTmp -DestinationPath $env:TEMP -Force
$nodeDir = Get-ChildItem -Path $env:TEMP -Filter "node-v*-win-x64" -Directory | Select-Object -First 1
Copy-Item -Recurse -Force $nodeDir.FullName (Join-Path $BinDir "node")
Remove-Item $nodeTmp

# Install pnpm via npm
$npmExe = Join-Path $BinDir "node\npm.cmd"
Start-Process -FilePath $npmExe -ArgumentList "install -g pnpm" -Wait -NoNewWindow

Write-Host ""
Write-Host "All binaries downloaded."
Write-Host "NOTE: You still need to manually place the fluxer_gateway Windows release in bin\fluxer_gateway\"
Write-Host "NOTE: Valkey for Windows must be downloaded from https://github.com/valkey-io/valkey/releases"
