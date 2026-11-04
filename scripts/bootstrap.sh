#!/usr/bin/env bash
# One-time setup: creates the GitHub repo, secrets, variables, labels, branch rules,
# the Cloudflare Pages project, then (optionally) hands the first issue to the agents.
# Run from the repo root on your Mac:  bash scripts/bootstrap.sh
# Safe to re-run: every step is idempotent or skips if already done.
set -euo pipefail

REPO_NAME="${REPO_NAME:-ai-dev-deploy-demo}"
bold() { printf '\n\033[1m%s\033[0m\n' "$1"; }
ask_secret() { # $1 = var name, $2 = prompt
  local v; printf '%s: ' "$2" >&2; read -rs v; echo >&2; printf '%s' "$v"
}
pause() { printf '\n%s\nPress Enter when done… ' "$1"; read -r _; }

# ── 0. Preflight ────────────────────────────────────────────────────────────────
if [ -d _github ]; then
  echo "Moving _github/ → .github/ (workflows were delivered outside .github for safety; review them first)."
  mkdir -p .github && cp -R _github/. .github/ && rm -rf _github
fi
if [ -d _claude ]; then
  echo "Moving _claude/ → .claude/ (local /ai-* skills)."
  mkdir -p .claude && cp -R _claude/. .claude/ && rm -rf _claude
fi
rm -rf planner   # superseded by agents/planner.md
[ -d .github/workflows ] || { echo "No .github/workflows found."; exit 1; }
for bin in git gh curl python3; do
  command -v "$bin" >/dev/null || { echo "Missing $bin. Install it first (brew install $bin)."; exit 1; }
done
gh auth status >/dev/null 2>&1 || gh auth login --web --git-protocol https --scopes "repo,workflow"
gh auth status 2>&1 | grep -q "workflow" || gh auth refresh -h github.com -s workflow   # needed to push .github/workflows
gh auth setup-git
OWNER=$(gh api user --jq .login)
REPO="$OWNER/$REPO_NAME"
bold "Setting up $REPO"

# ── 1. Local git + GitHub repo ─────────────────────────────────────────────────
[ -d .git ] || git init -b main
git add -A
git diff --cached --quiet || git commit -m "Scaffold: agent rules, roadmap, pipelines

The last human-directed commit. From here, AI agents plan, build, review and deploy."
if ! gh repo view "$REPO" >/dev/null 2>&1; then
  gh repo create "$REPO" --public --source . --remote origin \
    --description "A website planned, designed, built, reviewed and deployed entirely by AI agents."
fi
git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$REPO.git"
gh repo edit "$REPO" --enable-squash-merge --enable-merge-commit=false --enable-rebase-merge=false \
  --delete-branch-on-merge --enable-issues

# ── 2. Labels ──────────────────────────────────────────────────────────────────
bold "Creating labels"
while IFS="$(printf '\t')" read -r name color desc; do
  [ -n "$name" ] && gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" --force >/dev/null
done < .github/labels.tsv

# ── 3. Claude GitHub App (lets agents push branches, open PRs, comment) ───────
bold "Install the Claude GitHub App"
echo "Opening https://github.com/apps/claude — install it on $REPO only."
open "https://github.com/apps/claude/installations/new" 2>/dev/null || true
pause "Install the app for the $REPO_NAME repository."

# ── 4. Secrets ─────────────────────────────────────────────────────────────────
have_secret() { gh secret list --repo "$REPO" --json name --jq '.[].name' | grep -qx "$1"; }
set_secret() { gh secret set "$1" --repo "$REPO" --body "$2" >/dev/null && echo "  ✓ $1"; }

bold "Secrets (input is hidden; skipped if already set)"
have_secret ANTHROPIC_API_KEY || set_secret ANTHROPIC_API_KEY "$(ask_secret x 'Anthropic API key (sk-ant-…)')"

if ! have_secret AI_GITHUB_PAT; then
  echo "Create a fine-grained token: https://github.com/settings/personal-access-tokens/new"
  echo "  Repository access: Only $REPO"
  echo "  Permissions: Contents RW · Issues RW · Pull requests RW (Metadata R is automatic)"
  open "https://github.com/settings/personal-access-tokens/new" 2>/dev/null || true
  set_secret AI_GITHUB_PAT "$(ask_secret x 'Fine-grained GitHub token (github_pat_…)')"
fi

if ! have_secret CLOUDFLARE_API_TOKEN; then
  echo "Cloudflare: My Profile → API Tokens → Create Custom Token → Account · Cloudflare Pages · Edit"
  CF_TOKEN=$(ask_secret x 'Cloudflare API token')
  set_secret CLOUDFLARE_API_TOKEN "$CF_TOKEN"
fi
if ! have_secret CLOUDFLARE_ACCOUNT_ID; then
  printf 'Cloudflare Account ID (dashboard → Workers & Pages, right sidebar): '; read -r CF_ACCOUNT
  set_secret CLOUDFLARE_ACCOUNT_ID "$CF_ACCOUNT"
fi

if ! have_secret TELEGRAM_BOT_TOKEN; then
  echo "Telegram: message @BotFather → /newbot → copy the token."
  TG_TOKEN=$(ask_secret x 'Telegram bot token')
  set_secret TELEGRAM_BOT_TOKEN "$TG_TOKEN"
  pause "Now open your new bot in Telegram and send it any message (e.g. 'hi')."
  TG_CHAT=$(curl -s "https://api.telegram.org/bot${TG_TOKEN}/getUpdates" | python3 -c '
import json,sys
r=json.load(sys.stdin).get("result",[])
ids=[u["message"]["chat"]["id"] for u in r if "message" in u]
print(ids[-1] if ids else "")')
  if [ -z "$TG_CHAT" ]; then printf "Couldn't detect chat id. Enter it manually: "; read -r TG_CHAT; fi
  set_secret TELEGRAM_CHAT_ID "$TG_CHAT"
  curl -s -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=$TG_CHAT" --data-urlencode "text=👋 AI Dev Deploy Demo is wired up. You'll hear from the agents here." >/dev/null
fi

# ── 5. Cloudflare Pages project ────────────────────────────────────────────────
if [ -z "$(gh variable list --repo "$REPO" --json name --jq '.[] | select(.name=="SITE_URL") | .name')" ]; then
  bold "Creating Cloudflare Pages project"
  CF_TOKEN="${CF_TOKEN:-$(ask_secret x 'Cloudflare API token (again, to create the project)')}"
  CF_ACCOUNT="${CF_ACCOUNT:-}"; [ -n "$CF_ACCOUNT" ] || { printf 'Cloudflare Account ID: '; read -r CF_ACCOUNT; }
  resp=$(curl -s -X POST "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT/pages/projects" \
    -H "Authorization: Bearer $CF_TOKEN" -H "Content-Type: application/json" \
    --data "{\"name\":\"$REPO_NAME\",\"production_branch\":\"main\"}")
  if ! printf '%s' "$resp" | python3 -c 'import json,sys; sys.exit(0 if json.load(sys.stdin)["success"] else 1)'; then
    # Already exists? fetch it instead.
    resp=$(curl -s "https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT/pages/projects/$REPO_NAME" \
      -H "Authorization: Bearer $CF_TOKEN")
  fi
  SUB=$(printf '%s' "$resp" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["result"]["subdomain"] if d.get("success") else "")')
  [ -n "$SUB" ] || { echo "Cloudflare error: $resp"; exit 1; }
  gh variable set CF_PAGES_PROJECT --repo "$REPO" --body "$REPO_NAME"
  gh variable set SITE_URL --repo "$REPO" --body "https://$SUB"
  echo "  ✓ Site will live at https://$SUB"
fi

# ── 6. Variables ───────────────────────────────────────────────────────────────
gh variable set AI_ENABLED --repo "$REPO" --body "true"
gh variable list --repo "$REPO" --json name --jq '.[].name' | grep -qx AI_MODEL \
  || gh variable set AI_MODEL --repo "$REPO" --body "claude-sonnet-5-5"

# ── 7. Push (triggers first production deploy) ─────────────────────────────────
bold "Pushing to GitHub"
git push -u origin main

# ── 8. Protect main: PRs only, CI must pass ───────────────────────────────────
if [ -z "$(gh api "repos/$REPO/rulesets" --jq '.[] | select(.name=="protect-main") | .id')" ]; then
  gh api -X POST "repos/$REPO/rulesets" --input - >/dev/null <<'JSON'
{
  "name": "protect-main",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["~DEFAULT_BRANCH"], "exclude": [] } },
  "rules": [
    { "type": "deletion" },
    { "type": "non_fast_forward" },
    { "type": "pull_request", "parameters": {
        "required_approving_review_count": 0, "dismiss_stale_reviews_on_push": false,
        "require_code_owner_review": false, "require_last_push_approval": false,
        "required_review_thread_resolution": false } },
    { "type": "required_status_checks", "parameters": {
        "strict_required_status_checks_policy": false,
        "required_status_checks": [ { "context": "ci" } ] } }
  ]
}
JSON
  echo "  ✓ main is protected (PR + passing 'ci' check required)"
fi

# ── 9. Kick off ────────────────────────────────────────────────────────────────
bold "Ready."
echo "Repo:  https://github.com/$REPO"
echo "Pause agents:  gh variable set AI_ENABLED --repo $REPO --body false"
printf '\nHand the first issue (Design & build v1) to the agents now? [y/N] '; read -r go
if [ "$go" = "y" ] || [ "$go" = "Y" ]; then
  gh issue create --repo "$REPO" --label "ai:ready" \
    --title "Design and build v1 of 'How I developed this site with AI'" \
    --body "Replace the placeholder with a distinctive v1 that sets the visual identity for an
interactive, data-driven site (see CLAUDE.md 'Design direction' and ROADMAP.md Milestone 1).

## Acceptance criteria
- [ ] Visual identity: type, colour, grid, motion — light + dark — that later sections build on
- [ ] Hero that makes it obvious within seconds that AI agents built and run this site
- [ ] Headline counters driven by site/data/stats.json (spend, tokens, agent runs, PRs merged,
      days running), animated count-up, respecting prefers-reduced-motion
- [ ] 'The team' section with each agent's live numbers from stats.byRole
- [ ] 'How it works' from site/content/how-it-works.json: every section and FAQ entry, wording
      exactly as approved. The workflow must be a clear visual step-by-step diagram (who, trigger,
      output, human control point). This page will be shown to developers and the CEO.
- [ ] Build log from site/build-log.json, enriched with features.json where available
- [ ] Every number comes from site/data/ — nothing hard-coded; graceful when data is sparse
- [ ] Responsive 375px–1440px, WCAG AA, keyboard accessible
- [ ] Build-log entry for this PR

## Design notes
You own the design. Avoid generic SaaS-template looks. Think mission control crossed with a
lab notebook — something with character that can grow into charts, an evolution scrubber
and run replays in later milestones. Read docs/DATA.md first."
  echo "🚀 Issue filed. Watch Telegram."
fi
