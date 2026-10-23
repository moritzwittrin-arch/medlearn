# MedLearn – Installer für Windows
# Wird von "MedLearn installieren (Windows).cmd" gestartet. Kann für Updates erneut ausgeführt werden – Daten bleiben erhalten.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # macht Downloads deutlich schneller
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

$Src  = Split-Path -Parent $PSScriptRoot
$Dest = Join-Path $env:USERPROFILE 'MedLearn'

function Step($t) { Write-Host ""; Write-Host "> $t" -ForegroundColor Cyan }
function Ok($t)   { Write-Host "  OK  $t" -ForegroundColor Green }
function Warn($t) { Write-Host "  !   $t" -ForegroundColor Yellow }
function Fail($t) {
  Write-Host ""; Write-Host "FEHLER: $t" -ForegroundColor Red
  Write-Host "Bitte einen Screenshot dieses Fensters an den Absender schicken."
  Read-Host "Enter drücken zum Schließen"; exit 1
}

try {
  Clear-Host
  Write-Host " MedLearn – Installation" -ForegroundColor White
  Write-Host " Dauert ca. 3–5 Minuten. Bitte das Fenster offen lassen."

  # 0) Laufende Version beenden
  try { Invoke-RestMethod -Method Post -Uri 'http://localhost:3210/api/shutdown' -TimeoutSec 2 | Out-Null; Start-Sleep -Seconds 1 } catch {}

  # 1) App-Dateien nach %USERPROFILE%\MedLearn kopieren
  Step 'App-Dateien kopieren'
  New-Item -ItemType Directory -Force -Path $Dest | Out-Null
  $same = (Resolve-Path $Src).Path.TrimEnd('\').ToLower() -eq (Resolve-Path $Dest).Path.TrimEnd('\').ToLower()
  if (-not $same) {
    & robocopy $Src $Dest /E /XD data node_modules runtime .git /XF .DS_Store /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -ge 8) { Fail "Kopieren fehlgeschlagen (robocopy $LASTEXITCODE)." }
    Ok "nach $Dest kopiert (deine Lerndaten liegen in $Dest\data)"
  } else { Ok 'Installer läuft bereits im App-Ordner' }
  Get-ChildItem -Path $Dest -Recurse -File -ErrorAction SilentlyContinue | Unblock-File -ErrorAction SilentlyContinue
  Set-Location $Dest

  # 2) Node.js (>= 22.13) – sonst lokal nach MedLearn\runtime\node (ohne Admin-Rechte)
  Step 'Node.js prüfen'
  function NodeOk($exe) {
    try { $v = (& $exe -p 'process.versions.node' 2>$null).Trim().Split('.') | ForEach-Object { [int]$_ }; return ($v[0] -gt 22) -or ($v[0] -eq 22 -and $v[1] -ge 13) } catch { return $false }
  }
  $local = Join-Path $Dest 'runtime\node\node.exe'
  $sys = (Get-Command node -ErrorAction SilentlyContinue).Source
  if ((Test-Path $local) -and (NodeOk $local)) { $NodeDir = Split-Path $local; Ok "Node $(& $local -v) (lokal)" }
  elseif ($sys -and (NodeOk $sys)) { $NodeDir = Split-Path $sys; Ok "Node $(& $sys -v) (bereits installiert)" }
  else {
    $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
    $base = 'https://nodejs.org/dist/latest-v22.x'
    try { $sums = (Invoke-WebRequest -UseBasicParsing "$base/SHASUMS256.txt").Content } catch { Fail 'nodejs.org nicht erreichbar – Internetverbindung prüfen.' }
    $line = ($sums -split "`n") | Where-Object { $_ -match "win-$arch\.zip$" } | Select-Object -First 1
    if (-not $line) { Fail "Keine passende Node.js-Version für win-$arch gefunden." }
    $sum, $file = ($line.Trim() -split '\s+')
    Write-Host "  lade $file …"
    $tmp = Join-Path $env:TEMP "medlearn-$([guid]::NewGuid().ToString('N'))"
    New-Item -ItemType Directory -Force -Path $tmp | Out-Null
    Invoke-WebRequest -UseBasicParsing -Uri "$base/$file" -OutFile (Join-Path $tmp $file)
    if ((Get-FileHash (Join-Path $tmp $file) -Algorithm SHA256).Hash.ToLower() -ne $sum.ToLower()) { Fail 'Download von Node.js beschädigt – bitte erneut versuchen.' }
    $rt = Join-Path $Dest 'runtime'
    if (Test-Path (Join-Path $rt 'node')) { Remove-Item -Recurse -Force (Join-Path $rt 'node') }
    New-Item -ItemType Directory -Force -Path $rt | Out-Null
    Expand-Archive -Path (Join-Path $tmp $file) -DestinationPath $rt -Force
    Get-ChildItem $rt -Directory | Where-Object { $_.Name -like 'node-v*' } | Select-Object -First 1 | Rename-Item -NewName 'node'
    Remove-Item -Recurse -Force $tmp
    $NodeDir = Join-Path $rt 'node'
    Ok "Node $(& (Join-Path $NodeDir 'node.exe') -v) installiert"
  }
  $ClaudeBin = Join-Path $env:USERPROFILE '.local\bin'
  $env:PATH = "$NodeDir;$ClaudeBin;$env:PATH"

  # 3) Pakete
  Step 'Programmbausteine installieren (npm)'
  & (Join-Path $NodeDir 'npm.cmd') install --omit=dev --no-audit --no-fund --loglevel=error
  if ($LASTEXITCODE -ne 0) { Fail 'npm install fehlgeschlagen.' }
  Ok 'fertig'

  # 4) Claude Code (nutzt das eigene Claude-Abo)
  Step 'Claude Code prüfen'
  $claude = (Get-Command claude -ErrorAction SilentlyContinue).Source
  if (-not $claude -and (Test-Path (Join-Path $ClaudeBin 'claude.exe'))) { $claude = Join-Path $ClaudeBin 'claude.exe' }
  if (-not $claude) {
    Write-Host '  Claude Code wird installiert …'
    try { Invoke-Expression (Invoke-RestMethod 'https://claude.ai/install.ps1') } catch { Fail "Claude Code konnte nicht installiert werden: $($_.Exception.Message)" }
    if (Test-Path (Join-Path $ClaudeBin 'claude.exe')) { $claude = Join-Path $ClaudeBin 'claude.exe' }
    else { $claude = (Get-Command claude -ErrorAction SilentlyContinue).Source }
  }
  if (-not $claude) { Fail 'Claude Code nicht gefunden.' }
  Ok "Claude Code $((& $claude --version 2>$null | Select-Object -First 1))"

  Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
  function ClaudeOk {
    $o = Join-Path $env:TEMP 'medlearn-claude-test.txt'; $in = Join-Path $env:TEMP 'medlearn-empty.txt'
    Set-Content -Path $in -Value '' -NoNewline
    try {
      $p = Start-Process -FilePath $claude -ArgumentList '-p "Antworte nur mit OK" --output-format json --no-session-persistence' `
        -WorkingDirectory $env:TEMP -RedirectStandardOutput $o -RedirectStandardInput $in -NoNewWindow -PassThru
      if (-not $p.WaitForExit(90000)) { try { $p.Kill() } catch {}; return $false }
      return ((Get-Content $o -Raw -ErrorAction SilentlyContinue) -match '"is_error":\s*false')
    } catch { return $false } finally { Remove-Item $o, $in -ErrorAction SilentlyContinue }
  }
  Step 'Anmeldung bei Claude prüfen'
  if (ClaudeOk) { Ok 'angemeldet' }
  else {
    Write-Host ''
    Write-Host '  Du musst dich einmalig mit deinem Claude-Konto anmelden:'
    Write-Host '   1. Gleich startet Claude in diesem Fenster. Farbschema mit Enter bestätigen.'
    Write-Host '   2. "Claude account with subscription" wählen -> der Browser öffnet sich -> anmelden.'
    Write-Host '   3. Fragen mit Enter bestätigen, bis die Eingabezeile erscheint.'
    Write-Host '   4. Dann /exit eintippen und Enter drücken – die Installation geht weiter.'
    Write-Host ''
    Read-Host '  Enter drücken, um Claude zu starten'
    try { & $claude } catch {}
    if (ClaudeOk) { Ok 'angemeldet' } else { Warn 'Anmeldung noch nicht bestätigt – später in MedLearn unter Einstellungen > Verbindung testen prüfen.' }
  }

  # 5) Verknüpfungen (Desktop + Startmenü) mit MedLearn-Symbol
  Step 'MedLearn-Symbol anlegen'
  $ws = New-Object -ComObject WScript.Shell
  $targets = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))
  foreach ($dir in $targets) {
    if (-not $dir) { continue }
    $lnk = $ws.CreateShortcut((Join-Path $dir 'MedLearn.lnk'))
    $lnk.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
    $lnk.Arguments = '"' + (Join-Path $Dest 'install\start.vbs') + '"'
    $lnk.WorkingDirectory = $Dest
    $lnk.IconLocation = (Join-Path $Dest 'install\icon.ico') + ',0'
    $lnk.Description = 'MedLearn starten'
    $lnk.Save()
  }
  Ok 'auf dem Desktop und im Startmenü'

  Step 'Fertig!'
  Write-Host '  MedLearn startest du ab jetzt über das Symbol auf dem Desktop oder im Startmenü.'
  Write-Host '  Es öffnet sich im Browser unter http://localhost:3210'
  Write-Host '  Tipp: Rechtsklick auf das Symbol im Startmenü -> "An Taskleiste anheften".'
  Start-Process (Join-Path $env:WINDIR 'System32\wscript.exe') -ArgumentList ('"' + (Join-Path $Dest 'install\start.vbs') + '"')
  Write-Host ''
  Read-Host 'Enter drücken zum Schließen'
} catch {
  Fail $_.Exception.Message
}
