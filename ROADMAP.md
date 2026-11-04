# Roadmap

The Planner agent turns this into issues. Humans edit this file to steer direction;
agents read it but must not edit it (propose changes via an `ai:needs-human` issue).

## Vision

**"How I developed this site with AI"** — an interactive, data-rich exhibit of its own
creation. Not a brochure: a living mission log you can explore. Every number, timeline and
screenshot comes from real telemetry the pipeline records about itself (docs/DATA.md), so
the site gets richer with every PR the agents ship.

## Milestone 1 — v1: a real foundation (not a basic page)

> Priority: this site will be shown to developers and the CEO. **"How it works" content
> (site/content/how-it-works.json) is part of v1, and the workflow explanation must be excellent.**

- [ ] Visual identity + layout system: distinctive type, colour, grid; light/dark; motion
      principles. Hero that makes it obvious, in seconds, that AI agents built and run this.
- [ ] Headline counters from `stats.json`: AI spend, tokens, agent runs, PRs merged, bugs
      auto-fixed, median hours from idea to live, days running. Animated count-up.
- [ ] "Meet the team": Planner, Developer, Reviewer, Fixer, Release — each with live
      scorecard numbers from `stats.byRole` (runs, avg cost, rejection rate for Reviewer…).
- [ ] **"How it works"** from `site/content/how-it-works.json`: leadership summary near the top;
      the 7-stage **workflow** as a clear visual diagram (who / trigger / output / where a human
      can step in); the four ways developers work with it; the AI team; guardrails; "when things
      go wrong"; customising; the FAQ (filterable by audience, "asked during the build" badges);
      glossary. Every word as approved.
- [ ] Build log rendered from `build-log.json` merged with `features.json` (state, cost,
      review rounds per entry).
- [ ] Footer: latest deploy (sha, time, PR) and links to the repo.

## Milestone 2 — make the process explorable

- [ ] **Evolution scrubber** over `evolution.json`: a slider/timeline through every deployed
      version, desktop/mobile + light/dark toggles, keyboard-operable, lazy-loaded images.
- [ ] **Feature journey** view: pick a feature, see its `events` as an animated timeline,
      including the Reviewer's actual comments and each agent run's cost.
- [ ] **Agent run replay**: open any run from `runs.json`, step/autoplay through its trace
      (`traces/<id>.json`) — thoughts and tool calls — with cost/turns/time alongside.
- [ ] **Charts** from `daily.json`: spend per day, PRs/deploys per day, tokens by role,
      tool-usage breakdown. Accessible (text alternatives / data tables).
- [ ] Pipeline diagram (inline SVG) of the agent loop, with live counts on each edge.

## Milestone 3 — polish & performance

- [ ] Lighthouse ≥ 95 performance/accessibility/best-practices/SEO.
- [ ] Open Graph / social share image + favicon.
- [ ] Deep links: `#feature-12`, `#run-<id>`, `#version-<id>` restore the right view.
- [ ] Proposal (`ai:needs-human`): Lighthouse scores captured per deploy into telemetry.

## Milestone 4 — live & ops

- [ ] Proposal (`ai:needs-human`): Cloudflare Worker exposing "what are the agents doing right
      now" (open `ai:in-progress` issues, running workflows) + Telegram `/pause` `/resume`.
- [ ] "Right now" status widget using that Worker.

## Milestone 5 — Chaos day

- [ ] A human deliberately breaks something. The pipeline should detect, file, fix and
      redeploy without help. The incident gets its own journey page on the site.
