#!/usr/bin/env bash
# Automated pre-rehearsal check (headless Chromium, no real phone or camera):
# unit tests, build, then offline reload of every route, a full offline phone
# run, and an offline webcam scan of that run's QR.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-$(mktemp -d)}"
mkdir -p "$OUT/shots"
npm test
npm run build
npx vite preview --port 4173 --strictPort >/dev/null 2>&1 &
PREVIEW=$!
trap 'kill $PREVIEW' EXIT
sleep 2
node scripts/offline-check.cjs http://localhost:4173
node scripts/phone-run.cjs http://localhost:4173 "$OUT/shots"
node scripts/report-scan.cjs "$OUT/shots/13-handoff.png" http://localhost:4173 "$OUT"
echo "All automated checks passed. Screenshots in $OUT"
