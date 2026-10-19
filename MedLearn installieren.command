#!/bin/bash
# MedLearn – Installer für macOS
# Doppelklicken (oder im Terminal: bash "MedLearn installieren.command").
# Kann auch für Updates erneut ausgeführt werden – deine Daten bleiben erhalten.
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/MedLearn"
APPS="$HOME/Applications"

step() { printf "\n\033[1;36m▸ %s\033[0m\n" "$1"; }
ok()   { printf "  \033[32m✓ %s\033[0m\n" "$1"; }
warn() { printf "  \033[33m! %s\033[0m\n" "$1"; }
fail() { printf "\n\033[1;31m✗ %s\033[0m\n\n" "$1"; read -r -p "Enter drücken zum Schließen …" _; exit 1; }
trap 'fail "Unerwarteter Fehler in Zeile $LINENO. Bitte Screenshot an den Absender schicken."' ERR

clear
printf "\033[1m MedLearn – Installation\033[0m\n Dauert ca. 3–5 Minuten. Bitte das Fenster offen lassen.\n"
[ "$(uname)" = "Darwin" ] || fail "Dieser Installer ist für macOS."

# Claude-Abo? (ohne Abo: Lernen und Lernpakete funktionieren, nur eigene Skripte/Tutor nicht)
printf "\n Hast du ein eigenes Claude-Abo (Pro oder Max)?\n"
printf " Ohne Abo kannst du trotzdem alle Lernpakete lernen, die dir jemand schickt.\n"
read -r -p " Claude-Abo vorhanden? [j/N] " ABO
case "$ABO" in j|J|ja|Ja|y|Y) HAS_ABO=1 ;; *) HAS_ABO=0 ;; esac

# 0) Laufende Version beenden
curl -fs -m 2 -X POST http://localhost:3210/api/shutdown >/dev/null 2>&1 && sleep 1 || true

# 1) App-Dateien nach ~/MedLearn kopieren (außerhalb von iCloud – wichtig für die Datenbank)
step "App-Dateien kopieren"
lc() { printf "%s" "$1" | tr '[:upper:]' '[:lower:]'; }
if [ "$(lc "$(cd "$SRC" && pwd -P)")" != "$(lc "$(mkdir -p "$DEST" && cd "$DEST" && pwd -P)")" ]; then
  rsync -a --exclude 'data/' --exclude 'node_modules/' --exclude 'runtime/' --exclude '.DS_Store' "$SRC/" "$DEST/"
  ok "nach $DEST kopiert (deine Lerndaten bleiben in $DEST/data)"
else
  ok "Installer läuft bereits im App-Ordner"
fi
xattr -dr com.apple.quarantine "$DEST" 2>/dev/null || true
chmod +x "$DEST/install/start.sh" "$DEST/MedLearn installieren.command" 2>/dev/null || true
cd "$DEST"

# 2) Node.js (≥ 22.13) – wenn nicht vorhanden, lokal in ~/MedLearn/runtime (kein Admin-Passwort nötig)
step "Node.js prüfen"
node_ok() { "$1" -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)' >/dev/null 2>&1; }
if [ -x runtime/node/bin/node ] && node_ok runtime/node/bin/node; then
  NODE_DIR="$DEST/runtime/node/bin"; ok "Node $(runtime/node/bin/node -v) (lokal)"
elif command -v node >/dev/null && node_ok "$(command -v node)"; then
  NODE_DIR="$(dirname "$(command -v node)")"; ok "Node $(node -v) (bereits installiert)"
else
  A="x64"; [ "$(uname -m)" = "arm64" ] && A="arm64"
  BASE="https://nodejs.org/dist/latest-v22.x"
  LINE="$(curl -fsSL "$BASE/SHASUMS256.txt" | grep "darwin-$A.tar.gz" | head -1)" || fail "nodejs.org nicht erreichbar – Internetverbindung prüfen."
  SUM="${LINE%% *}"; FILE="${LINE##* }"
  echo "  lade $FILE …"
  TMP="$(mktemp -d)"
  curl -fL --progress-bar -o "$TMP/$FILE" "$BASE/$FILE"
  (cd "$TMP" && echo "$SUM  $FILE" | shasum -a 256 -c - >/dev/null) || fail "Download von Node.js beschädigt – bitte erneut versuchen."
  rm -rf runtime/node && mkdir -p runtime && tar -xzf "$TMP/$FILE" -C runtime && mv runtime/node-v* runtime/node
  rm -rf "$TMP"
  NODE_DIR="$DEST/runtime/node/bin"; ok "Node $("$NODE_DIR/node" -v) installiert"
fi
export PATH="$NODE_DIR:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

# 3) Pakete
step "Programmbausteine installieren (npm)"
npm install --omit=dev --no-audit --no-fund --loglevel=error || fail "npm install fehlgeschlagen."
ok "fertig"

mkdir -p data
if [ "$HAS_ABO" = "1" ]; then
rm -f data/no-ai
# 4) Claude Code (nutzt dein eigenes Claude-Abo)
step "Claude Code prüfen"
if ! command -v claude >/dev/null; then
  echo "  Claude Code wird installiert …"
  curl -fsSL https://claude.ai/install.sh | bash || fail "Claude Code konnte nicht installiert werden."
  export PATH="$HOME/.local/bin:$PATH"
fi
command -v claude >/dev/null || fail "Claude Code nicht gefunden."
ok "Claude Code $(claude --version 2>/dev/null | head -1)"

claude_ok() {
  ( cd /tmp && perl -e 'alarm 90; exec @ARGV' env -u ANTHROPIC_API_KEY claude -p "Antworte nur mit OK" --output-format json \
      --tools '' --no-session-persistence 2>/dev/null | grep -q '"is_error":false' )
}
step "Anmeldung bei Claude prüfen"
if claude_ok; then
  ok "angemeldet"
else
  printf "\n  Du musst dich einmalig mit deinem Claude-Konto anmelden:\n"
  printf "   1. Gleich startet Claude im Terminal. Farbschema mit Enter bestätigen.\n"
  printf "   2. Anmeldemethode „Claude account with subscription“ wählen → der Browser öffnet sich → anmelden.\n"
  printf "   3. Fragen mit Enter bestätigen, bis die Eingabezeile erscheint.\n"
  printf "   4. Dann \033[1m/exit\033[0m eintippen und Enter drücken – die Installation geht weiter.\n\n"
  read -r -p "  Enter drücken, um Claude zu starten …" _
  (cd "$DEST" && env -u ANTHROPIC_API_KEY claude) || true
  claude_ok && ok "angemeldet" || warn "Anmeldung noch nicht bestätigt – du kannst sie später in MedLearn unter Einstellungen › Verbindung testen prüfen."
fi
else
  touch data/no-ai
  step "Ohne Claude-Abo"
  ok "MedLearn läuft ohne KI: Lernpakete importieren und lernen geht, eigene Skripte und Tutor nicht."
  printf "  Später doch ein Abo? Installer einfach nochmal starten und „j“ wählen.\n"
fi

# 5) Programmsymbol „MedLearn“ in ~/Programme
step "MedLearn-Symbol anlegen"
mkdir -p "$APPS"
rm -rf "$APPS/MedLearn.app"
osacompile -o "$APPS/MedLearn.app" -e "do shell script \"/bin/bash \" & quoted form of \"$DEST/install/start.sh\" & \" > /dev/null 2>&1 &\"" >/dev/null
if [ -f install/icon.png ]; then
  IS="$(mktemp -d)/MedLearn.iconset"; mkdir -p "$IS"
  for s in 16 32 128 256 512; do
    sips -z $s $s install/icon.png --out "$IS/icon_${s}x${s}.png" >/dev/null
    sips -z $((s*2)) $((s*2)) install/icon.png --out "$IS/icon_${s}x${s}@2x.png" >/dev/null
  done
  iconutil -c icns "$IS" -o "$APPS/MedLearn.app/Contents/Resources/applet.icns" && touch "$APPS/MedLearn.app"
fi
ok "$APPS/MedLearn.app"

if ! defaults read com.apple.dock persistent-apps 2>/dev/null | grep -q "MedLearn.app"; then
  read -r -p "  MedLearn ins Dock legen? [J/n] " DOCK
  if [ -z "$DOCK" ] || [ "$DOCK" = "j" ] || [ "$DOCK" = "J" ]; then
    defaults write com.apple.dock persistent-apps -array-add "<dict><key>tile-data</key><dict><key>file-data</key><dict><key>_CFURLString</key><string>file://$APPS/MedLearn.app/</string><key>_CFURLStringType</key><integer>15</integer></dict></dict></dict>"
    killall Dock || true
    ok "im Dock"
  fi
fi

step "Fertig!"
printf "  MedLearn startest du ab jetzt über das Symbol im Dock oder mit Spotlight (⌘ + Leertaste → „MedLearn“).\n"
printf "  Es öffnet sich im Browser unter http://localhost:3210\n\n"
open "$APPS/MedLearn.app"
read -r -p "Enter drücken zum Schließen …" _
