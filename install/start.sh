#!/bin/bash
# Startet MedLearn (falls es nicht schon läuft) und öffnet es im Browser.
APP="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-3210}"
URL="http://localhost:$PORT"
export PATH="$APP/runtime/node/bin:$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

if curl -fs -m 2 "$URL/api/version" >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi

cd "$APP" || exit 1
mkdir -p data
LOG="data/server.log"
# Log klein halten
if [ -f "$LOG" ] && [ "$(wc -c < "$LOG")" -gt 5000000 ]; then mv -f "$LOG" "$LOG.alt"; fi
echo "---- Start $(date) ----" >> "$LOG"
nohup node --disable-warning=ExperimentalWarning server/index.js >> "$LOG" 2>&1 &
# Der Server öffnet den Browser selbst, sobald er bereit ist.
