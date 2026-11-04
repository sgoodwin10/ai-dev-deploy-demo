# Making changes to the site (for the human)

You never need to write code, but you can at any time. Pick whichever fits the size of the change.

| You want to… | Do this | What happens |
|---|---|---|
| **Add a feature or change something specific** | Open an issue (Task template), describe the goal, add the label **`ai:ready`** | Developer builds it → Reviewer checks → auto-merge → live. You get Telegram updates. |
| **Report a bug** | Open an issue (Bug template), then add **`ai:ready`** | Same loop, labelled `ai:bug` so it shows up in the site's incident stats. |
| **Tweak a PR that's in flight** | Comment on the PR: `@claude make the hero headline bigger and lose the gradient` | Claude pushes the change to that PR; CI and review re-run. |
| **Ask a question / explore an idea** | Comment on an issue: `@claude how would we add a dark-mode toggle?` | Claude answers in the thread. Label the issue `ai:ready` if you want it built. |
| **Change overall direction** | Edit `ROADMAP.md` (via a PR, since `main` is protected) | The Planner picks it up on its next run (`gh workflow run ai-plan.yml`). |
| **Stop a PR from merging** | Add the label **`ai:needs-human`**, or comment your objection | Auto-merge only fires on `ai:approved`; `ai:needs-human` takes it out of the loop. |
| **Change it yourself** | Branch, edit `site/`, open a PR | CI + the Reviewer agent review your PR like anyone else's, then it auto-merges. |
| **Change a guardrail** (workflows, CLAUDE.md, agents/, telemetry scripts, docs/DATA.md) | Edit and open a PR, then merge it yourself | Auto-merge deliberately refuses these — only you can merge them. |
| **Change how an agent works** | Edit `agents/developer.md` (or reviewer/fixer/planner) in a PR, merge it yourself | Every future run of that agent uses the new instructions. See `agents/README.md`. |
| **Use a stronger model for one hard feature** | Add label **`ai:opus`** to the issue before `ai:ready` | Developer runs on Opus for that issue only. |
| **Pause everything** | `gh variable set AI_ENABLED --body false` | Every AI workflow skips until you set it back to `true`. |

## Working locally (your own code, AI review)

```bash
git checkout -b human/hero-tweak       # any branch name NOT starting with ai/
npm install                            # first time only
npm run data                           # pull real stats/telemetry into site/data/
npm run serve                          # http://localhost:4173 — edit site/ and refresh
npm run validate && npm run screenshot # same checks CI runs
git commit -am "Tighten hero spacing" && git push -u origin HEAD
gh pr create --fill                    # or --draft for review only, no merge
```

Then:
1. **CI** validates, screenshots and posts a Cloudflare **preview link** on the PR.
2. The **Reviewer agent** reviews your diff *and* the screenshots, and comments.
3. **Approved →** auto-merged and deployed (unless it's a draft — drafts get reviewed but never
   merged; mark it ready when you're happy).
   **Changes requested →** nothing happens automatically on your branch. Fix locally and push
   (review re-runs), or comment `@claude fix the review items` and it'll push the fixes for you.
4. Don't want the AI's opinion to merge it? Add `ai:needs-human` and merge yourself.

### With the same agents, locally (recommended)

In Claude Code, from this repo, the pipeline's agents are available as slash commands. They load
the **same** `agents/*.md` prompts and `CLAUDE.md`, and use the same `npm run` checks, so local
work matches what the pipeline produces:

```
/ai-develop 12                    # build issue #12 like the pipeline Developer would
/ai-develop add a cost-per-day chart
/ai-review                        # the GitHub Reviewer's verdict, before you push
/ai-fix                           # address the latest AI review on this branch's PR
/ai-plan charts                   # draft the next issues; created only when you approve
```

Typical loop: `/ai-develop …` → `/ai-review` → fix anything → push and open the PR → the
GitHub Reviewer should agree with your local one, and it auto-merges.

### With Claude Code or Claude desktop (free-form)

Just ask it, e.g. *"Make the hero counters animate on scroll, then open a PR."* It reads
`CLAUDE.md` automatically, so it will branch as `human/…`, run the checks, look at the
screenshots, add a build-log entry and open the PR — and the pipeline takes it from there.
Note: local sessions aren't captured in the cost/token telemetry (only pipeline runs are);
the PR, review rounds and deploy still show up in the site's stats.

Tip: add a `site/build-log.json` entry with `"role": "Human"` — your contributions are part of
the story too. The reviewer will offer a draft if you forget.

## From the command line

```bash
# New task, straight to the Developer
gh issue create --label ai:ready --title "Add a cost-per-day chart" \
  --body "Bar chart of daily.json costUsd, last 30 days, accessible table fallback."

# Hand an existing issue to the Developer
gh issue edit 12 --add-label ai:ready

# Steer a PR
gh pr comment 14 --body "@claude the mobile nav overlaps the counters at 375px — fix that"

# Run the Planner now
gh workflow run ai-plan.yml
```

## Good requests

The agents do best with: **the goal** (what a visitor should be able to do or feel),
**acceptance criteria** (a checklist), and **design notes** (look/feel, references). Small
and specific beats big and vague — one PR per issue, under ~300 lines.

## Notes

- Only **your** `@claude` comments trigger the agents. Strangers can open issues on this public
  repo, but nothing runs until you add `ai:ready`.
- Your own interventions show up in the site's stats (`humanInterventions`) — that's part of
  the honest story.
