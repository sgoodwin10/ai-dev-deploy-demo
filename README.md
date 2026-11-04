# How I developed this site with AI

> **New here?** Read [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md): the workflow, how developers work with it, guardrails and FAQ.

A website that is planned, designed, built, reviewed, deployed and debugged by AI agents.
The human is the client: he gets Telegram updates and steps in only when an issue or PR is
labelled `ai:needs-human`.

## How it works

```
 ROADMAP.md
     │  Planner (Claude, daily)
     ▼
 Issue [ai:ready] ──► Developer (Claude Code Action) ──► PR [ai:review]
                                                          │
                              CI: html-validate · Playwright screenshots · preview deploy
                                                          │
                                           Reviewer (Claude) reads diff + screenshots
                                   ┌──────────────────────┴───────────────────┐
                          [ai:changes-requested]                         [ai:approved]
                          Fixer pushes fixes ─► CI again              squash-merge ─► main
                          (max 3 rounds, then ai:needs-human)                    │
                                                              Deploy to Cloudflare Pages
                                                              Smoke test ─► fail? files ai:bug
                                                                         │
                                                                    Telegram 📲
```

Every PR adds an entry to `site/build-log.json`, so the site's content grows with its own history.

## Telemetry → site data

Every agent run records its cost, tokens, turns, tool calls, excerpts and a full step trace;
every deploy records itself and screenshots the live version. These land on the orphan
`telemetry` branch (`scripts/telemetry/`). On each build, `scripts/build-stats.mjs` combines that
with the GitHub issue/PR history into `site/data/*.json` — headline stats, per-agent
scorecards, feature journeys, daily series, run replays and the site's evolution.
Schema: [docs/DATA.md](docs/DATA.md).

## Workflows

| File | Role |
|------|------|
| `ai-plan.yml` | Planner — files small `ai:ready` issues from the roadmap |
| `ai-develop.yml` | Developer — implements an issue, opens a PR |
| `ci.yml` | Validation, screenshot QA, Cloudflare preview |
| `ai-review.yml` | Reviewer — approves or requests changes; routes CI failures back to Fixer |
| `ai-fix.yml` | Fixer — addresses review feedback |
| `ai-assist.yml` | Responds to the owner's `@claude` comments on issues and PRs |
| `ai-automerge.yml` | Merges approved PRs (refuses PRs that touch guardrail files) |
| `deploy.yml` | Production deploy + smoke test + auto bug filing |
| `notify.yml` | Telegram feed |

## Controls

**Want to change something?** See [docs/MAKING-CHANGES.md](docs/MAKING-CHANGES.md) — issues + `ai:ready`,
`@claude` comments on PRs, roadmap edits, or your own PRs.

- **Pause all agents:** `gh variable set AI_ENABLED --body false` (resume with `true`)
- **Run the planner now:** `gh workflow run ai-plan.yml`
- **Hand an issue to the developer:** add the `ai:ready` label
- **Customise an agent's prompt:** edit `agents/<role>.md` — see [agents/README.md](agents/README.md)
- **Change model:** repo variables `AI_MODEL`, or per role `AI_DEVELOPER_MODEL` / `AI_REVIEWER_MODEL` / `AI_FIXER_MODEL` / `AI_PLANNER_MODEL`; label an issue `ai:opus` to use Opus for that issue

## Setup

See [docs/SETUP.md](docs/SETUP.md). Short version: `bash scripts/bootstrap.sh`.

## Local preview

```bash
npm install
npm run serve        # http://localhost:4173
npm run screenshot   # writes screenshots/*.png
```
