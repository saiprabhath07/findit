#!/usr/bin/env bash
# One-time setup for FindIt (Linux / macOS)
cd "$(dirname "$0")" || exit 1
echo "== FindIt setup =="

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed."
  echo "Install the LTS version from https://nodejs.org (Ubuntu: sudo apt install nodejs npm), then run ./setup.sh again."
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Node 18 or newer is needed (found $(node -v)). Please upgrade."
  exit 1
fi
echo "Using Node $(node -v) and npm $(npm -v)"

mkdir -p data uploads
[ -s data/items.json ]  || echo "[]" > data/items.json
[ -s data/claims.json ] || echo "[]" > data/claims.json
if [ ! -s data/locations.json ]; then
  echo "data/locations.json is missing. Re-clone the repository."
  exit 1
fi

echo "Installing dependencies (needs internet)..."
npm install || { echo "npm install failed. Check your internet connection."; exit 1; }

chmod +x run.sh 2>/dev/null
echo
echo "Setup complete."
echo "  Start the app:        ./run.sh"
echo "  Start with sample data: ./run.sh demo"
