<!-- GENERATED from site/content/how-it-works.json by `npm run content:md`. Edit the JSON, not this file. -->

# How it works

**A website built, reviewed and shipped by AI agents, with a human in charge.**

Every change to this site is planned, coded, reviewed, tested and deployed by a team of AI agents running in GitHub. A human (Samuel) sets the direction, can step in at any point, and gets a Telegram message whenever something happens. All the numbers on this page come from logs the pipeline records about itself.

## For leadership

- What it is: a working experiment in handing the routine software lifecycle (plan, build, review, test, deploy) to AI agents, using normal developer tools: GitHub, pull requests, CI and Cloudflare.
- The human role: deciding what to build, setting the rules the agents follow, and stepping in when an agent gets stuck. Nothing reaches production without passing automated checks and an AI code review.
- Cost and speed: every agent run is metered. The live counters on this page show total spend and the typical time from idea to live.
- Risk controls: agents can't push to production directly, can't change their own rules, and can be paused instantly with one switch.

## The workflow, step by step

This is the same pull-request workflow most teams already use. The only difference is who does each step. Every change goes through a branch, a PR, automated checks and a review before it reaches main. Nobody, human or AI, pushes straight to production.

```
1. Idea → issue  →  2. Build  →  3. Automated checks  →  4. AI code review  →  5. Fix loop  →  6. Merge  →  7. Deploy and verify
```

### 1. Idea → issue

- **Who:** Planner agent, or a human
- **Trigger:** The Planner runs, or a person writes an issue.
- **What happens:** A GitHub issue describes the goal, the acceptance criteria and design notes.
- **Output:** An issue.
- **Where a human can step in:** Nothing is built until the issue has the ai:ready label. Only people with write access to the repo can add it.

### 2. Build

- **Who:** Developer agent
- **Trigger:** Label ai:ready.
- **What happens:** Branches as ai/issue-N-…, writes the code, runs validation, takes screenshots and checks them visually, and writes a build-log entry.
- **Output:** A pull request that says 'Closes #N'.
- **Where a human can step in:** Comment '@claude …' on the PR to redirect it, or add ai:needs-human to take it out of the loop.

### 3. Automated checks

- **Who:** CI (no AI)
- **Trigger:** The PR is opened or updated.
- **What happens:** HTML validation, then screenshots at 375px and 1440px in light and dark mode, which fail on console errors or horizontal scroll. Then a preview deploy to Cloudflare.
- **Output:** Pass or fail, a preview URL, and screenshots.
- **Where a human can step in:** Open the preview link on the PR and see the change running.

### 4. AI code review

- **Who:** Reviewer agent
- **Trigger:** Checks pass.
- **What happens:** Reviews the diff and the screenshots against the project rules (CLAUDE.md), accessibility basics and design quality.
- **Output:** Either ai:approved, or ai:changes-requested with a numbered list of fixes.
- **Where a human can step in:** The review is a normal PR comment you can read and argue with. You can override it at any time.

### 5. Fix loop

- **Who:** Fixer agent
- **Trigger:** ai:changes-requested on an agent branch.
- **What happens:** Fixes each item and pushes. Steps 3 and 4 run again.
- **Output:** An updated PR.
- **Where a human can step in:** Capped at 3 rounds, after which it is labelled ai:needs-human and you get a Telegram ping. On a human's own branch, nothing is pushed automatically.

### 6. Merge

- **Who:** Release automation
- **Trigger:** ai:approved.
- **What happens:** Squash-merges into main, unless the PR touches a guardrail file (workflows, agent instructions, telemetry scripts, the rules file). Those wait for a human to merge.
- **Output:** One commit on main per feature.
- **Where a human can step in:** Open the PR as a draft to get a review without a merge, or add ai:needs-human to stop it.

### 7. Deploy and verify

- **Who:** Release automation
- **Trigger:** A push to main.
- **What happens:** Rebuilds the site's stats, deploys to Cloudflare, screenshots the live version for the evolution timeline, and smoke-tests production.
- **Output:** A live site and a Telegram '🚀 Deployed' message.
- **Where a human can step in:** If the smoke test fails, a bug issue is filed automatically and the Developer starts on it, and you are notified.

**Key points**

- Everything is a normal GitHub pull request, so you can read, comment on and revert anything, just as you would for a human's work.
- The AI reviews the AI, but the rules it reviews against are written and owned by a human, and the agents can't change them.
- A human can join at any step: comment, take over a branch, block a merge, or pause everything.

## How developers work with it

There are four ways in, and all of them end in the same place: a PR that gets the same automated checks and the same AI review.

### 1. Hand it to the agents

*Best for:* Well-defined features and bugs you don't need to write yourself.

1. Open an issue: the goal, acceptance criteria and design notes.
2. Add the label ai:ready (add ai:opus too, if it's hard).
3. Watch Telegram. The PR, review, merge and deploy all happen without you.

```
gh issue create --label ai:ready --title "Add a cost-per-day chart" --body "…"
```

### 2. Steer a PR in flight

*Best for:* When the agent is close but not quite right.

1. Comment on the PR: "@claude make the headline bigger and drop the gradient".
2. Claude pushes the change to that PR.
3. Checks and review run again automatically.

```
gh pr comment 14 --body "@claude the mobile nav overlaps the counters at 375px — fix that"
```

> Only the repo owner's comments trigger it. Strangers on this public repo can't spend the AI budget.

### 3. Use the same agents locally

*Best for:* Working interactively in Claude Code while keeping output consistent with the pipeline.

1. In Claude Code, run /ai-develop 12 (or describe the task in words).
2. Run /ai-review to get the GitHub Reviewer's verdict before you push.
3. Approve the push. The PR then goes through the normal pipeline.

```
/ai-develop add a cost-per-day chart  →  /ai-review  →  push
```

> These commands load exactly the same instruction files the GitHub agents use, so there is one source of truth. Local branches are named human/… so the pipeline never pushes to them.

### 4. Write it yourself, AI reviews it

*Best for:* When you want full control of the code.

1. Create a branch (any name that doesn't start with ai/), code, and run npm run validate and npm run screenshot.
2. Push and open a PR (add --draft if you only want a review).
3. The AI Reviewer reviews your PR like anyone else's. If approved, it auto-merges. If changes are requested, fix them yourself or comment "@claude fix the review items".

```
git checkout -b human/hero-tweak … gh pr create --fill
```

> The Fixer never pushes to a human's branch on its own. On your branch, its review is advice.

## The AI team

| Role | In one line | Triggered by | Does | Can't |
|---|---|---|---|---|
| **Planner** | Decides what to build next. | Run on demand (a daily schedule is planned). | Reads the roadmap, the open issues and the live site, then writes 1–2 small, specific issues with acceptance criteria. | Edit code or open PRs. It plans; others build. |
| **Developer** | Builds one issue at a time. | An issue gets the ai:ready label. | Creates a branch, writes the code, runs the checks, takes screenshots of its own work and looks at them, adds a build-log entry, and opens a PR. | Push to main, edit the guardrail files, or merge its own work. |
| **Reviewer** | Approves or sends back every PR. | A PR passes its automated checks. | Reads the code changes and the screenshots (desktop and mobile, light and dark), checks them against the project rules, then approves or requests specific changes. | Edit code. Its instructions are always loaded from main, so a PR can't rewrite them. |
| **Fixer** | Addresses review feedback. | The Reviewer requests changes on an agent's PR. | Works through the Reviewer's numbered list, pushes the fixes, and the review runs again. | Loop forever. After 3 rounds the PR is handed to a human. |
| **Release** | Merges, deploys and checks. | The Reviewer approves. | Squash-merges the PR, deploys to Cloudflare, screenshots the live version, and smoke-tests it. If production breaks, it files a bug, and the Developer picks the bug up automatically. | Merge anything that touches the guardrail files. Those need a human. |

## The stack

| Tool | Role | Detail |
|---|---|---|
| **GitHub** | Where the work happens | Code, issues (tasks) and pull requests (proposed changes). The agents coordinate through these the same way a human team would. |
| **GitHub Actions** | Runs the agents | Each agent is a workflow that starts automatically when something happens: an issue is labelled, a PR passes its checks, a review asks for changes. |
| **Claude (Anthropic)** | The AI agents | Each agent is Claude running with its own instructions and a limited set of tools. They run through the official Claude Code GitHub Action and use Anthropic's API. |
| **Cloudflare Pages** | Hosting | Every PR gets its own preview URL. Merging to main deploys to production, and an automated smoke test then checks the live site. |
| **Telegram** | Notifications | A bot messages the owner when issues are opened, PRs are reviewed or merged, deploys go live, and anything fails. |

## Guardrails

- **No direct pushes to production.** main is branch-protected. Every change needs a PR and passing checks, including the agents' changes and the owner's.
- **Agents can't change their own rules.** Workflows, agent instructions, the rules file and the telemetry scripts are guardrail files. Auto-merge refuses any PR that touches them, so a human has to merge it.
- **Review instructions can't be tampered with.** Each agent's instructions are always loaded from main, never from the PR it's working on. A PR can't rewrite the Reviewer to approve itself.
- **Bounded loops.** At most 3 review rounds per PR, one Developer at a time, and turn limits on every agent run. When a limit is hit, a human is notified.
- **Spend controls.** There is a monthly spend limit on the Anthropic account. Every run's cost is logged and shown on this site. The model can be set per agent.
- **Public repo, private budget.** Anyone can open an issue, but only the owner can label it ai:ready or trigger @claude. Bug reports from the public don't start agents.
- **Kill switch.** One repository variable (AI_ENABLED=false) pauses every agent immediately. Deploys of already-merged work still run.
- **Secrets stay secret.** Keys live only in GitHub's encrypted secrets. Agent transcripts are scrubbed for tokens before anything is published.

## When things go wrong

| If… | Then… |
|---|---|
| The agent's code fails the automated checks | The PR is sent straight back to the Fixer with a link to the failed run. This counts as a review round. |
| The Reviewer keeps rejecting | After 3 rounds the PR is labelled ai:needs-human and the owner gets a Telegram ping. Nothing merges. |
| The issue is unclear | The Developer comments on the issue asking for clarification, labels it ai:needs-human, and stops without guessing. |
| Production breaks after a merge | The smoke test fails, a bug issue is filed and labelled ai:ready, the Developer starts fixing it, and the owner is notified. The incident appears in the site's stats. |
| An agent tries to change a guardrail file | The PR can be reviewed, but auto-merge refuses it and labels it ai:needs-human. |
| Something needs to stop right now | Set AI_ENABLED=false. Every agent workflow skips until it's set back to true. |

## Customising the agents

| Where | Affects | Example |
|---|---|---|
| `agents/<role>.md` | One role, every time | "Developer: always include a short design rationale in the PR." |
| `CLAUDE.md` | Every agent, every time | "Total JS on first load must stay under 150 KB." |
| `The issue body` | One feature | "Use a horizontal timeline for this one, not a vertical one." |
| `Repo variables / labels` | Which model runs | AI_DEVELOPER_MODEL, AI_REVIEWER_MODEL, …; the ai:opus label for one hard issue. |

Instruction files are guardrails, so changing an agent's prompt is always a human decision that goes through a PR.

## Questions asked while building this

These are the real questions asked while setting this project up, with the answers that shaped how it works.

### What do you need to run a fully AI-driven project?

*Asked during the build* · *For: everyone*

A GitHub repo (code, issues, PRs), GitHub Actions to run the agents, an Anthropic API key for Claude, Cloudflare Pages for hosting, and a Telegram bot for notifications. A one-time setup script wires them together in about 20 minutes.

### Is the data rich enough to build an interactive site, not just a basic page?

*Asked during the build* · *For: everyone*

Not at first, so we built a telemetry layer before the first agent ran. Every agent run records its cost, tokens, turns, tools used and a replayable step-by-step trace. Every deploy records itself and screenshots the live site. That is combined with the GitHub history of issues, PRs and reviews, and it powers every number, timeline and replay on this site.

### How can I make changes to the site?

*Asked during the build* · *For: developers*

There are four ways: open an issue and label it ai:ready; comment '@claude …' on a PR; use the same agents locally with /ai-develop; or write the code yourself and let the AI review it. All four end in a PR that gets the same checks and the same review.

### Can I make changes locally, push, open a PR and have the AI review it?

*Asked during the build* · *For: developers*

Yes. Your PR gets the same CI, preview deploy and AI review as an agent's PR. If it's approved, it auto-merges (drafts are reviewed but never merged). If changes are requested, the Fixer does not push to your branch; you fix it yourself or ask '@claude fix the review items'.

### Can I use Claude Code or Claude desktop locally and have the automation carry on?

*Asked during the build* · *For: developers*

Yes. Claude reads the project rules automatically, uses a human/… branch (so the pipeline treats it as your PR), runs the same checks and opens the PR, and then the pipeline takes over. Local sessions aren't included in the cost telemetry, but their PRs, reviews and deploys are.

### Can I customise the prompt of the agent that writes the code?

*Asked during the build* · *For: developers*

Yes. Each agent's instructions are a plain markdown file in agents/. Edit developer.md and every future Developer run follows it. Rules for every agent go in CLAUDE.md, and instructions for one feature go in the issue. You can also choose the model per agent.

### How do I keep local work consistent with what the AI pipeline produces?

*Asked during the build* · *For: developers*

Run the same agents locally: /ai-develop, /ai-review, /ai-fix and /ai-plan in Claude Code. They load the same instruction files, the same rules and the same checks as the GitHub agents, so there's one source of truth. Use /ai-review before pushing to see what the GitHub Reviewer will say.

### If the AI reviews the AI, who's checking the reviewer?

*For: developers*

The human-owned rules. The Reviewer checks every PR against CLAUDE.md and a definition of done that only a human can change. It also looks at real screenshots, not just code. Every review is a public PR comment, and anything that touches the rules themselves needs a human merge.

### What stops it from merging bad code to production?

*For: everyone*

Four layers: automated checks (validation, screenshot QA), an AI review against human-written rules, branch protection on main, and a post-deploy smoke test that files and fixes a bug automatically if production breaks. Every merge is one squash commit, so a revert is a one-liner.

### What does it cost?

*For: leadership*

Every agent run is metered, and the live counters on this page show the running total, cost per feature and cost per agent. The Anthropic account has a hard monthly spend limit, and cheaper or stronger models can be chosen per agent.

### Does this replace developers?

*For: leadership*

Not in this setup. The agents handle the routine loop of building, checking and shipping well-defined work. People decide what's worth building, set the standards, handle anything ambiguous or risky, and own the guardrails. The best-supported way to work is a mix: hand off the routine, steer with comments, and code the hard parts yourself with AI help.

### Can it be stopped instantly?

*For: everyone*

Yes. One switch (AI_ENABLED=false) pauses every agent. Any single PR can be taken out of the loop with the ai:needs-human label.

### Is it safe to run on a public repository?

*For: developers*

Agents only start when the owner labels an issue or comments '@claude'. Outside contributors can't trigger paid runs. Secrets live in GitHub's encrypted store, and published transcripts are scrubbed for tokens.

## Glossary

- **Issue** — A task: a feature, bug or idea, written down in GitHub.
- **Pull request (PR)** — A proposed change, reviewed before it's merged into the live code.
- **CI** — Automated checks that run on every PR.
- **main** — The branch that is deployed to production.
- **ai:ready** — Label: the Developer agent should build this issue.
- **ai:approved / ai:changes-requested** — Labels: the Reviewer agent's verdict.
- **ai:needs-human** — Label: agents are stuck or hit a guardrail, and a person decides.
- **ai:opus** — Label: use the strongest model for this issue.
- **Guardrail files** — Workflows, agent instructions, rules and telemetry scripts. Only a human can merge changes to them.
- **Telemetry** — The automatic record of every agent run and deploy that feeds this site's numbers.
