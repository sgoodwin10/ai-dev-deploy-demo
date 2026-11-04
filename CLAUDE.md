# CLAUDE.md — Rules for every AI agent in this repo

This repository is an experiment: a website that is planned, designed, built, reviewed,
deployed and maintained entirely by AI agents. A human (Samuel) is the client. He watches
via Telegram and only intervenes when an issue is labelled `ai:needs-human`.

The site itself tells the story of how it was built ("How I developed this site with AI").
Your work *is* the content — so write commit messages, PR descriptions and build-log
entries as if a curious reader will see them. They will.

## The team

| Role | Runs as | Trigger | Job |
|------|---------|---------|-----|
| Planner | `.github/workflows/ai-plan.yml` (later: Managed Agent, scheduled) | manual / cron | Reads ROADMAP.md, open issues, live site → files 1–3 small issues labelled `ai:ready` |
| Developer | `.github/workflows/ai-develop.yml` | issue labelled `ai:ready` | Implements one issue, opens one PR |
| Reviewer | `.github/workflows/ai-review.yml` | CI passes on a PR | Reviews code + screenshots, labels `ai:approved` or `ai:changes-requested` |
| Fixer | `.github/workflows/ai-fix.yml` | PR labelled `ai:changes-requested` | Addresses review feedback on the same branch |
| Release | `.github/workflows/ai-automerge.yml` + `deploy.yml` | PR labelled `ai:approved` | Squash-merges, deploys to Cloudflare Pages, smoke-tests, files `ai:bug` on failure |

## Are you a pipeline agent or a local session?

- **Pipeline agent** (running inside a GitHub Actions workflow): follow every rule below as written.
- **Local session** (Claude Code / Claude desktop on Samuel's machine, working with him directly):
  Samuel is the owner and is directing you. Follow the same quality rules and Definition of Done,
  with these differences:
  - Name branches `human/<short-slug>` — **never `ai/…`** (that prefix tells the pipeline an
    agent owns the branch, and the Fixer would start pushing to it).
  - A linked issue is optional; if there is one, put `Closes #N` in the PR body.
  - Use `"role": "Human + Claude (local)"` in the build-log entry.
  - If Samuel explicitly asks you to change a guardrail file, you may — say in the PR description
    that auto-merge will refuse it and he must merge it himself.
  - Open the PR with `gh pr create` (add `--draft` if he only wants a review). The AI Reviewer
    then takes over automatically.

## Hard rules

1. **Never push to `main`.** All changes go through a PR. Pipeline agents use branches named
   `ai/issue-<N>-<slug>`; local sessions use `human/<slug>` (see above).
2. **Never modify the guardrails:** `.github/**`, `.claude/**`, `CLAUDE.md`, `agents/**`, `site/content/**`, `docs/DATA.md`, `scripts/bootstrap.sh`,
   `scripts/build-stats.mjs`, `scripts/telegram.sh`, `scripts/telemetry/**`. Auto-merge refuses
   PRs that touch them. If you believe one needs changing (e.g. you need a new field in the
   data), open an issue labelled `ai:needs-human` describing exactly what and why.
   **Never edit or commit `site/data/` or `site/evolution/`** — they are generated.
3. **One issue → one PR.** Keep PRs small (ideally < 300 changed lines). If an issue is too
   big, implement a slice and file follow-up issues (label them `ai:backlog`, not `ai:ready`).
4. **No secrets, keys, or tokens in code**, ever. No third-party trackers or analytics.
5. **No build step.** The site is static HTML/CSS/JS in `site/`. Small, focused libraries
   (a chart library, an animation helper) may be loaded from a CDN with an **exact pinned
   version** (`cdn.jsdelivr.net/npm/x@1.2.3`), justified in the PR description. Prefer
   hand-written SVG/Canvas when it's not much harder. Total JS on first load < 150 KB gzipped.
6. Every PR body must contain `Closes #<issue>` so the issue auto-closes on merge.

## Definition of done (every PR)

- [ ] `npm run validate` passes (HTML validity).
- [ ] `npm run screenshot` run, and you have *looked at* `screenshots/desktop.png` and
      `screenshots/mobile.png` with the Read tool. Fix anything that looks broken.
- [ ] Works at 375px wide and 1440px wide. No horizontal scroll on mobile.
- [ ] Accessible: semantic HTML, alt text, visible focus states, colour contrast ≥ 4.5:1.
- [ ] Data-driven sections render sensibly with the real data in `site/data/` **and** don't
      crash when a file is missing or an array is empty.
- [ ] **Build-log entry added** to `site/build-log.json` (see below).
- [ ] PR description explains *what* and *why*, written for a human reader.

## The build log (the site's living content)

`site/build-log.json` is an array, newest first. Every PR prepends one entry:

```json
{
  "date": "YYYY-MM-DD",
  "issue": 12,
  "role": "Developer",
  "title": "Short human title of what changed",
  "summary": "2–3 sentences, first person plural ('we'), about what was done and any interesting decision or mistake along the way."
}
```

Be honest. Mistakes, review rejections and bugs are the best part of the story.

## Owner-approved copy: `site/content/how-it-works.json`

This file holds the explanations Samuel will show to developers and the CEO: what the project is,
**the workflow step by step**, the four ways developers work with it, guardrails, failure
scenarios, customisation, the FAQ and the glossary. Rules:
- **Render it, don't rewrite it.** You own the presentation (layout, diagrams, interactivity,
  progressive disclosure), but the wording is approved. Don't paraphrase, cut or add claims.
  Small typographic changes (line breaks, emphasis) are fine.
- **Every section and every FAQ entry must appear on the site.** Load it at runtime
  (`fetch('content/how-it-works.json')`) so edits to the copy don't need code changes.
- The **workflow** section is the most important part for developers. It must be the clearest
  thing on the page: a visual step-by-step diagram (who, trigger, output, human control point),
  readable without scrolling back and forth, and fully usable on mobile.
- Two audiences: leadership needs `intro.forLeadership` plus the headline numbers within the
  first screen; developers need the workflow, the ways to work, guardrails and the FAQ.
  FAQ entries have an `audience` field, so consider a filter. Mark `asked: true` entries
  as "asked during the build".
- If the copy seems wrong or out of date with how the pipeline actually behaves, open an
  `ai:needs-human` issue; don't fix it yourself.

## Design direction — this is NOT a basic website

The site is an **interactive, data-rich exhibit** of its own creation — closer to a
mission-control dashboard crossed with a long-form story than a brochure page. Visitors
should be able to *explore* how AI built it, not just read about it.

The raw material is real, generated data (see **docs/DATA.md**): the cost, tokens, turns and
tool calls of every agent run; every issue's journey from planner to production; every review
verdict; screenshots of the site at every deployed version; full step-by-step traces of what
each agent did. Use it. Every number on the page must come from `site/data/` — never hard-code
or invent statistics.

Ambitions (the Planner breaks these into issues — see ROADMAP.md):
- Live headline counters (spend, tokens, PRs, bugs auto-fixed, time from idea to live).
- An **evolution scrubber**: drag through screenshots of every version of this very site.
- **Feature journeys**: pick any feature, watch its timeline play out — planner → developer →
  reviewer rejection → fix → approval → deploy — with the reviewer's real words.
- **Agent run replay**: step through a trace — thoughts and tool calls — like watching over
  the agent's shoulder.
- Agent scorecards and charts (cost per day, rejection rate, tool usage).

Quality bar:
- Distinctive and intentional — no generic SaaS template, no stock gradients-and-cards.
- Motion that explains (counters, timelines) — and respects `prefers-reduced-motion`.
- Light and dark mode. Works and looks designed at 375px and 1440px.
- Accessible: keyboard-operable interactive elements, ARIA where needed, contrast ≥ 4.5:1,
  charts have text alternatives.
- Fast: Lighthouse performance ≥ 90; lazy-load evolution images and traces.
- Graceful with tiny or empty data (day one) and with large data (month three).

## Project layout

```
site/              # Everything deployed to Cloudflare Pages (static)
  index.html
  build-log.json   # hand-written narrative entries (one per PR) — you maintain this
  content/         # OWNER-APPROVED copy (how-it-works.json) — render it, never edit it
  data/            # GENERATED stats/journeys/runs/traces — read-only for you (docs/DATA.md)
  evolution/       # GENERATED screenshots of every deployed version
scripts/           # serve, screenshot, build-stats, telemetry (guardrail scripts: don't edit)
agents/            # Each agent's role prompt (developer, reviewer, fixer, planner) — owner-edited
.claude/skills/    # /ai-develop /ai-review /ai-fix /ai-plan — the same agents, run locally
docs/DATA.md       # Schema of everything in site/data/
ROADMAP.md         # Product direction — the Planner works from this
```

Local loop: `npm run stats` (refresh data) → edit `site/` → `npm run validate` →
`npm run screenshot` → look at the PNGs.

## Kill switch

If repo variable `AI_ENABLED` is `false`, every AI workflow skips. Respect it.
