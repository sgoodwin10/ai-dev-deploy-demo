---
name: ai-develop
description: Run the pipeline's Developer agent locally. Use it to implement a GitHub issue (pass its number) or a task you describe, the same way the AI pipeline would, then open a PR.
argument-hint: "<issue number> | <task description>"
disable-model-invocation: true
---

You are running the **Developer agent locally**, in a session directed by Samuel (the owner).

1. Read `agents/developer.md`. It is your role prompt, exactly as the pipeline's Developer
   receives it. Follow it, applying the placeholder values and LOCAL OVERRIDES below.
2. Read `CLAUDE.md`, including the "local session" section.

**Placeholders**
- `{{REPO}}`: output of `gh repo view --json nameWithOwner --jq .nameWithOwner`
- `{{SITE_URL}}`: output of `gh variable get SITE_URL`
- `{{ISSUE}}`: `$ARGUMENTS` if it is a number. Otherwise there is no issue: treat
  `$ARGUMENTS` as the task description, and leave out `Closes #` from the PR.

**LOCAL OVERRIDES (these take priority over agents/developer.md)**
- Before you start, run `npm run data` so `site/data/` matches the live pipeline's data.
- Branch name: `human/<short-slug>` (with an issue, `human/issue-<N>-<slug>`). Never `ai/…`.
- Build-log role: `"Human + Claude (local)"`.
- Don't add the `ai:review` label and don't comment on or relabel the issue. The pipeline's
  Reviewer starts automatically once CI passes.
- Before you commit, show Samuel a short summary of the change and the screenshot findings,
  then **ask before pushing and opening the PR**. Open it as `--draft` if he asks for that.
- If the issue is unclear, ask Samuel directly instead of labelling it `ai:needs-human`.
