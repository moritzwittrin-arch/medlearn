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
# Ausgaben schreibt der Server selbst in data/server.log (auch nach Neustarts durch Updates)
MEDLEARN_LOG="$APP/data/server.log" nohup node --disable-warning=ExperimentalWarning server/index.js >/dev/null 2>&1 &
# Der Server öffnet den Browser selbst, sobald er bereit ist.
