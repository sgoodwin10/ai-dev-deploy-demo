# Agent instructions

Each pipeline agent's prompt lives here. Edit these to change how an agent behaves. No
workflow changes are needed.

| File | Agent | Runs when |
|------|-------|-----------|
| `developer.md` | Developer | An issue gets the `ai:ready` label |
| `reviewer.md` | Reviewer | CI passes on a PR |
| `fixer.md` | Fixer | The Reviewer labels an agent PR `ai:changes-requested` |
| `planner.md` | Planner | `gh workflow run ai-plan.yml` (or its schedule) |

**Placeholders** are filled in by the workflow before the agent sees the text:
`{{REPO}}` `{{ISSUE}}` `{{PR}}` `{{BRANCH}}` `{{SITE_URL}}`.

**How the layers combine.** Every agent gets this file's role prompt, then reads `CLAUDE.md`
(rules shared by every agent), then reads the issue or PR itself. So:
- Behaviour for **one role** goes here (for example, "the Developer must write a short design
  rationale in every PR").
- Rules for **every agent** go in `CLAUDE.md`.
- Instructions for **one feature** go in the issue body.

**Models.** Set the repo variables `AI_DEVELOPER_MODEL`, `AI_REVIEWER_MODEL`, `AI_FIXER_MODEL`
and `AI_PLANNER_MODEL` (each falls back to `AI_MODEL`, except the Planner, which defaults to Opus). Add the label **`ai:opus`** to a hard
issue to use Opus for that issue only.

**Security.** Workflows always load these files from `main`, never from a PR branch. A PR can't
rewrite the Reviewer's instructions to approve itself. These files are guardrails: agents can't
edit them, and auto-merge refuses PRs that touch them, so you merge changes yourself.

## Running the same agents locally

In Claude Code, from this repo, the same prompts are available as slash commands. They are thin
wrappers in `.claude/skills/` that load these files, so there's only ever one copy of each prompt:

| Command | Agent | Local difference |
|---------|-------|------------------|
| `/ai-develop 12` or `/ai-develop add a cost chart` | Developer | Branch `human/…`; asks before pushing |
| `/ai-review` | Reviewer | Reviews your local branch and prints the verdict; posts nothing |
| `/ai-fix` | Fixer | Fixes the latest review on the current PR; asks before pushing |
| `/ai-plan` | Planner | Drafts issues for your approval before creating them |
