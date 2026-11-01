#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Get the LTS version from https://nodejs.org"
  exit 1
fi

[ "$1" = "demo" ]  && node scripts/reset.js --demo
[ "$1" = "reset" ] && node scripts/reset.js

if [ ! -d node_modules ]; then
  echo "First run: installing dependencies (needs internet)..."
  npm install || exit 1
fi

URL="http://localhost:${PORT:-3000}"
(sleep 1.5; xdg-open "$URL" >/dev/null 2>&1 || open "$URL" >/dev/null 2>&1) &
echo "Starting FindIt at $URL  (Ctrl+C to stop)"
npm start
