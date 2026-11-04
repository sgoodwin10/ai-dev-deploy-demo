#!/usr/bin/env bash
# Usage: scripts/telegram.sh "<b>Message</b> with HTML"
# Needs TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in env. Silently no-ops if missing.
set -euo pipefail
if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "Telegram not configured; skipping notification."
  exit 0
fi
curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "text=$1" \
  --data-urlencode "parse_mode=HTML" \
  --data-urlencode "disable_web_page_preview=true" > /dev/null || echo "Telegram send failed (non-fatal)"
