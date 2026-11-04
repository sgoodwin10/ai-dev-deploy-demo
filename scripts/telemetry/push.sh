#!/usr/bin/env bash
# Commits the contents of a directory (default $RUNNER_TEMP/telemetry-out) onto the `telemetry`
# branch, creating it as an orphan branch on first use. Every record has a unique filename, so
# concurrent pushes never conflict — we just rebase and retry.
# Needs GH_TOKEN (contents:write) and GITHUB_REPOSITORY.
set -euo pipefail
SRC="${1:-${RUNNER_TEMP:-/tmp}/telemetry-out}"
MSG="${2:-telemetry: ${GITHUB_WORKFLOW:-manual} run ${GITHUB_RUN_ID:-local}}"
[ -d "$SRC" ] && [ -n "$(ls -A "$SRC" 2>/dev/null)" ] || { echo "Telemetry: nothing to push"; exit 0; }
SRC="$(cd "$SRC" && pwd)"   # absolute, since we cd into a temp clone below

URL="${TELEMETRY_REMOTE:-https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git}"   # override for local testing
WORK="$(mktemp -d)"
cd "$WORK"
git init --quiet
git config user.name "telemetry-bot"
git config user.email "telemetry-bot@users.noreply.github.com"
git remote add origin "$URL"

if git fetch --quiet --depth 1 origin telemetry 2>/dev/null; then
  git checkout --quiet -b telemetry FETCH_HEAD
else
  git checkout --quiet --orphan telemetry
  printf '# Telemetry\n\nMachine-written records of every AI agent run, deploy and site screenshot.\nWritten by scripts/telemetry/push.sh, read by scripts/build-stats.mjs. Do not edit by hand.\n' > README.md
fi

cp -R "$SRC"/. .
git add -A
git diff --cached --quiet && { echo "Telemetry: no changes"; exit 0; }
git commit --quiet -m "$MSG"

for i in 1 2 3 4 5; do
  if git push --quiet origin HEAD:telemetry 2>/dev/null; then
    echo "Telemetry: pushed $(find "$SRC" -type f | wc -l | tr -d ' ') file(s)"
    exit 0
  fi
  # Someone else pushed first: start again from the new tip and re-apply our files.
  echo "Telemetry: push rejected, retrying on fresh tip (attempt $i)"
  sleep $((i * 2))
  git fetch --quiet --depth 1 origin telemetry
  git reset --quiet --hard FETCH_HEAD
  cp -R "$SRC"/. .
  git add -A
  git commit --quiet -m "$MSG" || true
done
echo "::warning::Telemetry push failed after 5 attempts (non-fatal)"
