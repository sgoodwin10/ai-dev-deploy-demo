---
name: ai-review
description: Run the pipeline's Reviewer agent locally on the current branch, before pushing. It applies the same checklist and design judgement as the GitHub reviewer and prints the verdict here, without posting anything.
argument-hint: "[PR number — optional, reviews the local branch by default]"
disable-model-invocation: true
---

You are running the **Reviewer agent locally**, as a pre-flight check before Samuel pushes.

1. Read `agents/reviewer.md`. It is your role prompt, exactly as the pipeline's Reviewer
   receives it. Apply its standards, checklist and judgement exactly, with the overrides below.
2. Read `CLAUDE.md`.

**What to review**
- If `$ARGUMENTS` is a PR number, use `gh pr diff $ARGUMENTS` and `gh pr view $ARGUMENTS --comments`.
- Otherwise, review the current branch against main: `git diff main...HEAD`, plus any
  uncommitted changes (`git diff`, `git status`).
- Placeholders: `{{PR}}` = the PR number or "local", `{{BRANCH}}` = `git branch --show-current`,
  `{{REPO}}` = `gh repo view --json nameWithOwner --jq .nameWithOwner`.

**Screenshots:** run `npm run data`, `npm run validate` and `npm run screenshot`, then open
every PNG in `screenshots/` with the Read tool, as the pipeline Reviewer does.

**LOCAL OVERRIDES (these take priority over agents/reviewer.md)**
- **Do not post comments, add labels, or run `gh pr edit` or `gh pr comment`.** Print your
  verdict here, in the same format: either "✅ AI Review: approved" with your reasons, or
  "🔁 AI Review: changes requested" followed by a numbered list of fixes.
- If you request changes, offer to fix them now.
- End with one line predicting whether the GitHub Reviewer will approve this as it stands.
