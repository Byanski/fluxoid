
; Fluxoid custom NSIS additions
; This runs after the default electron-builder NSIS install

; Create a launcher batch file in the install dir
Section "Create Launcher"
  SetOutPath "$INSTDIR"
  
  ; Write a launcher that starts services then the app
  FileOpen $0 "$INSTDIR\Launch Fluxoid.bat" w
  FileWrite $0 "@echo off$\r$\n"
  FileWrite $0 "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File $\"%~dp0resources\fluxoid-windows\Start-Fluxoid.ps1$\"$\r$\n"
  FileClose $0

  ; Overwrite shortcuts to point to the launcher bat instead
  CreateShortcut "$DESKTOP\Fluxoid.lnk" "$INSTDIR\Launch Fluxoid.bat" "" "$INSTDIR\resources\fluxoid-windows\bin\caddy.exe" 0 SW_SHOWMINIMIZED
  CreateShortcut "$SMPROGRAMS\Fluxoid\Fluxoid.lnk" "$INSTDIR\Launch Fluxoid.bat" "" "$INSTDIR\resources\fluxoid-windows\bin\caddy.exe" 0 SW_SHOWMINIMIZED
SectionEnd

; Clean up services on uninstall
Section "un.StopServices"
  ; Kill any running service processes
  ExecWait 'taskkill /F /IM caddy.exe /T'
  ExecWait 'taskkill /F /IM nats-server.exe /T'
  ExecWait 'taskkill /F /IM valkey-server.exe /T'
  ExecWait 'taskkill /F /IM meilisearch.exe /T'
  ExecWait 'taskkill /F /IM livekit-server.exe /T'
  ExecWait 'taskkill /F /IM fluxer_gateway.exe /T'
  ExecWait 'taskkill /F /IM node.exe /T'
SectionEnd
