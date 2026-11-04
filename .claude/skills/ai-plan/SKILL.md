---
name: ai-plan
description: Run the pipeline's Planner agent locally. It proposes the next issues from ROADMAP.md and creates them only after Samuel approves.
argument-hint: "[optional focus, e.g. 'charts' or 'milestone 2']"
disable-model-invocation: true
---

You are running the **Planner agent locally**, in a session directed by Samuel.

1. Read `agents/planner.md`. It is your role prompt, exactly as the pipeline's Planner
   receives it. Follow it, applying the values and overrides below.
2. Placeholders: `{{REPO}}` = `gh repo view --json nameWithOwner --jq .nameWithOwner`,
   `{{SITE_URL}}` = `gh variable get SITE_URL`.

**LOCAL OVERRIDES (these take priority over agents/planner.md)**
- If `$ARGUMENTS` is given, focus the plan on it.
- Ignore the "2 or more open issues, stop" rule. Samuel is asking, so tell him how busy the
  team is and plan anyway.
- **Draft the issues here first** (title, body, acceptance criteria). Create them with
  `gh issue create` only after Samuel approves. Ask whether each one should get `ai:ready`
  (the pipeline builds it), stay `ai:backlog`, or be built locally with `/ai-develop <n>`.
