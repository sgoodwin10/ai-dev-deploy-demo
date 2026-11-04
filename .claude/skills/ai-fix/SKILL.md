---
name: ai-fix
description: Run the pipeline's Fixer agent locally. It addresses the latest AI review's requested changes on a PR (yours or an agent's) and pushes the fixes.
argument-hint: "[PR number — defaults to the PR for the current branch]"
disable-model-invocation: true
---

You are running the **Fixer agent locally**, in a session directed by Samuel.

1. Read `agents/fixer.md`. It is your role prompt, exactly as the pipeline's Fixer receives
   it. Follow it, applying the values and overrides below.
2. Read `CLAUDE.md`, including the "local session" section.

**Placeholders**
- `{{PR}}`: `$ARGUMENTS` if given, otherwise `gh pr view --json number --jq .number`
- `{{BRANCH}}`: that PR's head branch (`gh pr view {{PR}} --json headRefName --jq .headRefName`).
  Check it out locally with `gh pr checkout {{PR}}` if you aren't already on it.
- `{{REPO}}`: `gh repo view --json nameWithOwner --jq .nameWithOwner`

**LOCAL OVERRIDES (these take priority over agents/fixer.md)**
- Run `npm run data` first.
- Show Samuel the list of fixes and the screenshot findings, and **ask before pushing**.
- After pushing, still remove the `ai:changes-requested` label (step 6) so the pipeline knows
  the fixes are in. CI and the GitHub Reviewer then re-run automatically.
