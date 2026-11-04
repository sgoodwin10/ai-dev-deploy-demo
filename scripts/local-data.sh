#!/usr/bin/env bash
# Pulls the real telemetry + GitHub history so `npm run serve` shows live-like data locally.
# Uses your gh login; nothing is written anywhere except site/data/ and .telemetry/ (both gitignored).
set -euo pipefail
GH_TOKEN="$(gh auth token)"
GITHUB_REPOSITORY="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
SITE_URL="$(gh variable get SITE_URL 2>/dev/null || true)"
export GH_TOKEN GITHUB_REPOSITORY SITE_URL
bash scripts/telemetry/fetch.sh
node scripts/build-stats.mjs
