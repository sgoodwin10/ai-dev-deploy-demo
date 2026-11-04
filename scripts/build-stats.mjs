#!/usr/bin/env node
// Builds the site's data layer from (1) telemetry records on the `telemetry` branch and
// (2) the GitHub issue/PR history. Output is generated, never committed:
//
//   site/data/stats.json       headline totals, per-agent scorecards, medians
//   site/data/features.json    every issue's journey: opened → built → reviewed → merged → live
//   site/data/runs.json        every agent run (cost, tokens, turns, tools, excerpts)
//   site/data/daily.json       per-day series for charts
//   site/data/deploys.json     production deploy history
//   site/data/evolution.json   the site's screenshots at every deployed version
//   site/data/traces/<id>.json step-by-step replay of one agent run
//   site/evolution/<id>/*.jpg  the screenshot images themselves
//
// Schema: docs/DATA.md.  Env: GH_TOKEN + GITHUB_REPOSITORY (optional locally), TELEMETRY_DIR.
import { readFile, writeFile, mkdir, readdir, rm, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const TEL = process.env.TELEMETRY_DIR || '.telemetry';
const SITE = 'site';
const DATA = join(SITE, 'data');
const REPO = process.env.GITHUB_REPOSITORY || guessRepo();
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';

function guessRepo() {
  try {
    const url = execSync('git remote get-url origin', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return (url.match(/github\.com[/:](.+?)(\.git)?$/) || [])[1] || '';
  } catch { return ''; }
}
const sh = (c) => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };

async function readJsonDir(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const f of (await readdir(dir)).filter((f) => f.endsWith('.json'))) {
    try { out.push(JSON.parse(await readFile(join(dir, f), 'utf8'))); } catch { /* skip corrupt */ }
  }
  return out;
}

async function gh(path) {
  const items = [];
  let url = `https://api.github.com/repos/${REPO}${path}${path.includes('?') ? '&' : '?'}per_page=100`;
  while (url) {
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' },
    });
    if (!res.ok) throw new Error(`GitHub ${res.status} for ${url}`);
    const body = await res.json();
    if (!Array.isArray(body)) return body;
    items.push(...body);
    url = (res.headers.get('link') || '').match(/<([^>]+)>;\s*rel="next"/)?.[1] || null;
  }
  return items;
}

const sum = (xs, f = (x) => x) => xs.reduce((a, x) => a + (Number(f(x)) || 0), 0);
const median = (xs) => {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const hours = (a, b) => (a && b ? +((new Date(b) - new Date(a)) / 36e5).toFixed(2) : null);
const day = (iso) => (iso || '').slice(0, 10);
const round = (n, d = 4) => (Number.isFinite(n) ? +n.toFixed(d) : null);

// ── 1. Telemetry ────────────────────────────────────────────────────────────────
const runs = (await readJsonDir(join(TEL, 'runs'))).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
const deploys = (await readJsonDir(join(TEL, 'deploys'))).sort((a, b) => (a.finishedAt || '').localeCompare(b.finishedAt || ''));

// ── 2. GitHub history ───────────────────────────────────────────────────────────
let issues = [];
let prs = [];
if (TOKEN && REPO) {
  try {
    const all = await gh('/issues?state=all&sort=created&direction=asc');
    const prNums = all.filter((i) => i.pull_request).map((i) => i.number);
    issues = all.filter((i) => !i.pull_request);
    for (const n of prNums) {
      const [p, comments] = await Promise.all([gh(`/pulls/${n}`), gh(`/issues/${n}/comments`)]);
      prs.push({ ...p, _comments: comments });
    }
  } catch (e) {
    console.warn(`GitHub fetch failed (${e.message}); continuing with telemetry only.`);
  }
} else {
  console.warn('No GH_TOKEN/GITHUB_REPOSITORY — building from telemetry only (fine for local dev).');
}

const CLOSES = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
const linkedIssues = (body) => [...(body || '').matchAll(CLOSES)].map((m) => Number(m[1]));
const authorRole = (issue) => {
  const body = issue.body || '';
  if (body.includes('<!-- ai:planner -->')) return 'planner';
  if (/^Production deploy/.test(issue.title)) return 'release';
  if (issue.user?.type === 'Bot') return 'bot';
  return 'human';
};

const prInfo = prs.map((p) => {
  const reviews = p._comments
    .map((c) => {
      if (c.body.includes('<!-- ai-review:changes -->')) {
        return { at: c.created_at, verdict: /CI failed/.test(c.body) ? 'ci-failed' : 'changes', text: c.body.replace(/<!--.*?-->/g, '').trim().slice(0, 1200) };
      }
      if (/AI Review: approved/.test(c.body)) return { at: c.created_at, verdict: 'approved', text: c.body.trim().slice(0, 1200) };
      return null;
    })
    .filter(Boolean);
  return {
    number: p.number,
    title: p.title,
    url: p.html_url,
    author: p.user?.login,
    branch: p.head?.ref,
    createdAt: p.created_at,
    mergedAt: p.merged_at,
    closedAt: p.closed_at,
    state: p.merged_at ? 'merged' : p.state,
    additions: p.additions ?? 0,
    deletions: p.deletions ?? 0,
    changedFiles: p.changed_files ?? 0,
    commits: p.commits ?? 0,
    issues: linkedIssues(p.body),
    reviews,
    labels: (p.labels || []).map((l) => l.name),
  };
});

// ── 3. Feature journeys ─────────────────────────────────────────────────────────
const deployForPr = (n) => deploys.find((d) => d.pr === n && d.status === 'success');
const features = issues.map((i) => {
  const myPrs = prInfo.filter((p) => p.issues.includes(i.number));
  const myRuns = runs.filter((r) => r.issue === i.number || myPrs.some((p) => p.number === r.pr));
  const merged = myPrs.find((p) => p.mergedAt);
  const live = merged && deployForPr(merged.number);
  const events = [
    { at: i.created_at, kind: 'issue-opened', role: authorRole(i), detail: i.title },
    ...myRuns.map((r) => ({ at: r.recordedAt, kind: 'agent-run', role: r.role, detail: `${r.turns ?? '?'} turns · $${r.costUsd ?? '?'}`, run: r.id })),
    ...myPrs.map((p) => ({ at: p.createdAt, kind: 'pr-opened', role: 'developer', detail: `#${p.number} ${p.title}`, pr: p.number })),
    ...myPrs.flatMap((p) => p.reviews.map((rv) => ({ at: rv.at, kind: `review-${rv.verdict}`, role: rv.verdict === 'ci-failed' ? 'ci' : 'reviewer', detail: rv.text.slice(0, 280), pr: p.number }))),
    ...(merged ? [{ at: merged.mergedAt, kind: 'merged', role: 'release', pr: merged.number }] : []),
    ...(live ? [{ at: live.finishedAt, kind: 'live', role: 'release', detail: live.url }] : []),
    ...(i.closed_at ? [{ at: i.closed_at, kind: 'issue-closed', role: 'release' }] : []),
  ].sort((a, b) => a.at.localeCompare(b.at));
  return {
    issue: i.number,
    title: i.title,
    url: i.html_url,
    labels: (i.labels || []).map((l) => l.name),
    isBug: (i.labels || []).some((l) => l.name === 'ai:bug'),
    openedBy: authorRole(i),
    state: live ? 'live' : merged ? 'merged' : myPrs.length ? 'in-review' : i.state === 'closed' ? 'closed' : 'open',
    createdAt: i.created_at,
    closedAt: i.closed_at,
    mergedAt: merged?.mergedAt || null,
    liveAt: live?.finishedAt || null,
    hoursToMerge: hours(i.created_at, merged?.mergedAt),
    hoursToLive: hours(i.created_at, live?.finishedAt),
    prs: myPrs.map((p) => p.number),
    reviewRounds: sum(myPrs, (p) => p.reviews.filter((r) => r.verdict !== 'approved').length),
    additions: sum(myPrs, (p) => p.additions),
    deletions: sum(myPrs, (p) => p.deletions),
    costUsd: round(sum(myRuns, (r) => r.costUsd)),
    tokens: sum(myRuns, (r) => r.tokens.input + r.tokens.output + r.tokens.cacheRead + r.tokens.cacheWrite),
    runs: myRuns.map((r) => r.id),
    events,
  };
}).reverse(); // newest first

// ── 4. Per-agent scorecards ─────────────────────────────────────────────────────
const roles = [...new Set(runs.map((r) => r.role))];
const byRole = Object.fromEntries(roles.map((role) => {
  const rs = runs.filter((r) => r.role === role);
  const toolCounts = {};
  for (const r of rs) for (const [k, v] of Object.entries(r.toolCounts || {})) toolCounts[k] = (toolCounts[k] || 0) + v;
  return [role, {
    runs: rs.length,
    succeeded: rs.filter((r) => r.conclusion === 'success').length,
    costUsd: round(sum(rs, (r) => r.costUsd)),
    avgCostUsd: round(sum(rs, (r) => r.costUsd) / (rs.length || 1)),
    tokens: sum(rs, (r) => r.tokens.input + r.tokens.output + r.tokens.cacheRead + r.tokens.cacheWrite),
    avgTurns: round(sum(rs, (r) => r.turns) / (rs.length || 1), 1),
    avgDurationMin: round(sum(rs, (r) => r.durationMs) / (rs.length || 1) / 60000, 1),
    toolCalls: sum(rs, (r) => r.toolCalls),
    topTools: Object.entries(toolCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tool, count]) => ({ tool, count })),
    models: [...new Set(rs.map((r) => r.model).filter(Boolean))],
  }];
}));
const allReviews = prInfo.flatMap((p) => p.reviews);
if (byRole.reviewer) {
  byRole.reviewer.approvals = allReviews.filter((r) => r.verdict === 'approved').length;
  byRole.reviewer.changeRequests = allReviews.filter((r) => r.verdict === 'changes').length;
  const decided = byRole.reviewer.approvals + byRole.reviewer.changeRequests;
  byRole.reviewer.rejectionRate = decided ? round(byRole.reviewer.changeRequests / decided, 3) : null;
}

// ── 5. Daily series ─────────────────────────────────────────────────────────────
const days = new Map();
const bump = (d, k, v = 1) => {
  if (!d) return;
  const row = days.get(d) || { date: d, runs: 0, costUsd: 0, tokens: 0, prsOpened: 0, prsMerged: 0, issuesOpened: 0, deploys: 0, failedDeploys: 0, linesChanged: 0 };
  row[k] += v;
  days.set(d, row);
};
for (const r of runs) {
  bump(day(r.recordedAt), 'runs');
  bump(day(r.recordedAt), 'costUsd', r.costUsd || 0);
  bump(day(r.recordedAt), 'tokens', r.tokens.input + r.tokens.output + r.tokens.cacheRead + r.tokens.cacheWrite);
}
for (const p of prInfo) {
  bump(day(p.createdAt), 'prsOpened');
  if (p.mergedAt) { bump(day(p.mergedAt), 'prsMerged'); bump(day(p.mergedAt), 'linesChanged', p.additions + p.deletions); }
}
for (const i of issues) bump(day(i.created_at), 'issuesOpened');
for (const d of deploys) bump(day(d.finishedAt), d.status === 'success' ? 'deploys' : 'failedDeploys');
const daily = [...days.values()].sort((a, b) => a.date.localeCompare(b.date)).map((r) => ({ ...r, costUsd: round(r.costUsd) }));

// ── 6. Evolution (screenshots of every deployed version) ───────────────────────
const evolution = [];
const shotsRoot = join(TEL, 'screenshots');
await rm(join(SITE, 'evolution'), { recursive: true, force: true });
if (existsSync(shotsRoot)) {
  for (const id of (await readdir(shotsRoot)).sort()) {
    const metaPath = join(shotsRoot, id, 'meta.json');
    if (!existsSync(metaPath)) continue;
    const meta = JSON.parse(await readFile(metaPath, 'utf8'));
    if (meta.status !== 'success') continue;
    await mkdir(join(SITE, 'evolution', id), { recursive: true });
    const images = {};
    for (const f of meta.images || []) {
      await cp(join(shotsRoot, id, f), join(SITE, 'evolution', id, f));
      images[f.replace(/\.(png|jpe?g|webp)$/, '').replace(/-(\w)/g, (_, c) => c.toUpperCase())] = `evolution/${id}/${f}`;
    }
    evolution.push({ id, sha: meta.sha, title: meta.title, pr: meta.pr, at: meta.finishedAt, images });
  }
}
evolution.sort((a, b) => (a.at || '').localeCompare(b.at || ''));

// ── 7. Headline stats ───────────────────────────────────────────────────────────
const firstCommitAt = sh('git log --reverse --format=%cI | head -1') || runs[0]?.recordedAt || null;
const merged = prInfo.filter((p) => p.mergedAt);
const bugs = features.filter((f) => f.isBug);
const stats = {
  schema: 1,
  generatedAt: new Date().toISOString(),
  repo: REPO,
  repoUrl: REPO ? `https://github.com/${REPO}` : null,
  siteUrl: process.env.SITE_URL || null,
  sha: process.env.GITHUB_SHA || sh('git rev-parse HEAD') || null,
  firstCommitAt,
  daysRunning: firstCommitAt ? Math.max(1, Math.ceil((Date.now() - new Date(firstCommitAt)) / 864e5)) : null,
  totals: {
    agentRuns: runs.length,
    costUsd: round(sum(runs, (r) => r.costUsd), 2),
    tokens: {
      input: sum(runs, (r) => r.tokens.input),
      output: sum(runs, (r) => r.tokens.output),
      cacheRead: sum(runs, (r) => r.tokens.cacheRead),
      cacheWrite: sum(runs, (r) => r.tokens.cacheWrite),
    },
    turns: sum(runs, (r) => r.turns),
    toolCalls: sum(runs, (r) => r.toolCalls),
    agentMinutes: round(sum(runs, (r) => r.durationMs) / 60000, 1),
    issuesOpened: issues.length,
    issuesClosed: issues.filter((i) => i.state === 'closed').length,
    prsOpened: prInfo.length,
    prsMerged: merged.length,
    reviewRounds: allReviews.filter((r) => r.verdict !== 'approved').length,
    approvals: allReviews.filter((r) => r.verdict === 'approved').length,
    linesAdded: sum(merged, (p) => p.additions),
    linesRemoved: sum(merged, (p) => p.deletions),
    commits: Number(sh('git rev-list --count HEAD')) || null,
    deploys: deploys.filter((d) => d.status === 'success').length,
    failedDeploys: deploys.filter((d) => d.status !== 'success').length,
    bugsFiled: bugs.length,
    bugsFixed: bugs.filter((b) => b.state === 'live' || b.state === 'merged').length,
    humanInterventions: features.filter((f) => f.labels.includes('ai:needs-human')).length + prInfo.filter((p) => p.labels.includes('ai:needs-human')).length,
  },
  medians: {
    hoursIssueToMerge: median(features.map((f) => f.hoursToMerge)),
    hoursIssueToLive: median(features.map((f) => f.hoursToLive)),
    reviewRoundsPerPr: median(merged.map((p) => p.reviews.filter((r) => r.verdict !== 'approved').length)),
    costUsdPerFeature: median(features.filter((f) => f.costUsd).map((f) => f.costUsd)),
  },
  byRole,
  latestDeploy: deploys.filter((d) => d.status === 'success').at(-1) || null,
};

// ── 8. Write ────────────────────────────────────────────────────────────────────
await rm(DATA, { recursive: true, force: true });
await mkdir(join(DATA, 'traces'), { recursive: true });
const write = (name, obj) => writeFile(join(DATA, name), JSON.stringify(obj));
await Promise.all([
  write('stats.json', stats),
  write('features.json', features),
  write('runs.json', [...runs].reverse()),
  write('daily.json', daily),
  write('deploys.json', [...deploys].reverse()),
  write('evolution.json', evolution),
  write('prs.json', [...prInfo].reverse()),
]);
const traces = join(TEL, 'traces');
if (existsSync(traces)) await cp(traces, join(DATA, 'traces'), { recursive: true });

console.log(
  `Stats: ${runs.length} runs · $${stats.totals.costUsd} · ${issues.length} issues · ${prInfo.length} PRs · ` +
  `${deploys.length} deploys · ${evolution.length} versions → ${DATA}/`,
);
