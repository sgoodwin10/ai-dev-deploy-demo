# Setup (one time, ~20 minutes)

Everything below is collected and applied by `bash scripts/bootstrap.sh`. Have these ready
(or create them as the script prompts you).

## Before you run the script

1. **GitHub CLI** on your Mac: `brew install gh`
2. **Anthropic API key**: https://platform.claude.com/settings/keys
   - Set a monthly spend limit in the Console (Billing → Limits). Suggested for the demo: US$50.
3. **Cloudflare account** (free): https://dash.cloudflare.com/sign-up
   - API token: My Profile → API Tokens → Create Token → *Create Custom Token* →
     Permissions: **Account · Cloudflare Pages · Edit** → Create.
   - Account ID: Dashboard → Workers & Pages → right sidebar.
4. **Telegram bot**: open Telegram, message **@BotFather**, send `/newbot`, pick a name, copy the token.
   The script will ask you to message your bot once so it can detect your chat ID.

## Run it

```bash
cd ~/Sites/ai-dev-deploy-demo
bash scripts/bootstrap.sh
```

During the run it will:

1. Create the public repo `<you>/ai-dev-deploy-demo` and configure merge settings
2. Create the `ai:*` labels
3. Open the **Claude GitHub App** install page — install it on this repo only
4. Ask for secrets, including a **fine-grained GitHub token** (scoped to this repo:
   Contents RW, Issues RW, Pull requests RW). This lets agent actions trigger other workflows,
   which GitHub's built-in token cannot do.
5. Create the Cloudflare Pages project and record the site URL
6. Push, which triggers the first production deploy
7. Protect `main` (PR + passing `ci` check required)
8. Optionally file the first issue and start the agents

## Secrets and variables reference

| Name | Type | Used by |
|------|------|---------|
| `ANTHROPIC_API_KEY` | secret | all Claude agents |
| `AI_GITHUB_PAT` | secret | planner, auto-merge, bug filing, CI-failure routing |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | secret | preview + production deploy |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | secret | notifications |
| `AI_ENABLED` | variable | kill switch (`false` pauses all agents) |
| `AI_MODEL` / `AI_PLANNER_MODEL` | variable | model selection |
| `CF_PAGES_PROJECT`, `SITE_URL` | variable | deploy target + smoke test |
