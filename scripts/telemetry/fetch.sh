#!/usr/bin/env bash
# Checks out the `telemetry` branch into .telemetry/ (read-only use). Empty dir if it doesn't exist yet.
# Needs GH_TOKEN (any token with contents:read) and GITHUB_REPOSITORY.
set -euo pipefail
DEST="${1:-.telemetry}"
rm -rf "$DEST"
URL="${TELEMETRY_REMOTE:-https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git}"   # override for local testing
if git ls-remote --exit-code --heads "$URL" telemetry >/dev/null 2>&1; then
  git clone --quiet --depth 1 --branch telemetry --single-branch "$URL" "$DEST"
  rm -rf "$DEST/.git"
  echo "Telemetry: fetched $(find "$DEST/runs" -name '*.json' 2>/dev/null | wc -l | tr -d ' ') run records"
else
  mkdir -p "$DEST"
  echo "Telemetry: branch not created yet — starting empty"
fi
