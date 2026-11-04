#!/usr/bin/env node
// Turns one Claude Code Action run into a telemetry record (+ a replayable step trace).
//
// Usage (in a workflow, after the claude-code-action step):
//   node scripts/telemetry/record.mjs --role developer --issue 12 --pr 0 --conclusion success
//
// Reads  $RUNNER_TEMP/claude-execution-output.json (or --file)
// Writes $RUNNER_TEMP/telemetry-out/runs/<id>.json         (summary record)
//        $RUNNER_TEMP/telemetry-out/traces/<id>.json       (step-by-step trace for replay)
// Then scripts/telemetry/push.sh commits telemetry-out/ to the `telemetry` branch.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { redact, clip } from './redact.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]?.startsWith('--') ? 'true' : all[i + 1]]);
    return acc;
  }, []),
);

const TEMP = process.env.RUNNER_TEMP || '/tmp';
const file = args.file || join(TEMP, 'claude-execution-output.json');
const outDir = args.out || join(TEMP, 'telemetry-out');
const env = process.env;

const num = (v) => (v && !Number.isNaN(Number(v)) ? Number(v) : null);
const now = new Date().toISOString();
const runId = env.GITHUB_RUN_ID || String(Date.now());
const attempt = env.GITHUB_RUN_ATTEMPT || '1';
const role = (args.role || 'unknown').toLowerCase();
const id = `${now.replace(/[-:]/g, '').replace(/\..+/, '')}-${role}-${runId}-${attempt}`;

let messages = [];
if (existsSync(file)) {
  try {
    messages = JSON.parse(await readFile(file, 'utf8'));
  } catch (e) {
    console.warn(`Could not parse ${file}: ${e.message}`);
  }
} else {
  console.warn(`No execution file at ${file}; recording run metadata only.`);
}

const init = messages.find((m) => m?.type === 'system' && m?.subtype === 'init') || {};
const result = [...messages].reverse().find((m) => m?.type === 'result') || {};
const usage = result.usage || {};

// Build a compact, redacted trace of what the agent did.
const toolCounts = {};
const trace = [];
const texts = [];
for (const m of messages) {
  if (m?.type !== 'assistant') continue;
  for (const block of m.message?.content || []) {
    if (block.type === 'text' && block.text?.trim()) {
      const t = redact(block.text.trim());
      texts.push(t);
      trace.push({ kind: 'thought', text: clip(t, 600) });
    } else if (block.type === 'tool_use') {
      toolCounts[block.name] = (toolCounts[block.name] || 0) + 1;
      trace.push({ kind: 'tool', tool: block.name, summary: clip(redact(summariseTool(block)), 240) });
    }
  }
}

function summariseTool(b) {
  const i = b.input || {};
  if (i.command) return i.command;
  if (i.file_path) return i.file_path + (i.old_string ? ' (edit)' : '');
  if (i.pattern) return `${i.pattern}${i.path ? ' in ' + i.path : ''}`;
  if (i.url) return i.url;
  return JSON.stringify(i);
}

// Pick a few human-interesting excerpts for the site: the opening plan, the longest
// piece of reasoning, and the final summary.
const excerpts = [];
if (texts[0]) excerpts.push({ label: 'opening', text: clip(texts[0], 500) });
const hasResultText = typeof result.result === 'string' && result.result.trim();
const middle = hasResultText ? texts.slice(1) : texts.slice(1, -1);
const longest = [...middle].sort((a, b) => b.length - a.length)[0];
if (longest) excerpts.push({ label: 'thinking', text: clip(longest, 500) });
const finalText = hasResultText ? redact(result.result) : texts.length > 1 ? texts.at(-1) : null;
if (finalText) excerpts.push({ label: 'final', text: clip(finalText, 700) });

const record = {
  schema: 1,
  id,
  role,
  workflow: env.GITHUB_WORKFLOW || null,
  runId: num(runId),
  runUrl: env.GITHUB_SERVER_URL ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${runId}` : null,
  recordedAt: now,
  issue: num(args.issue),
  pr: num(args.pr),
  sha: env.GITHUB_SHA || null,
  conclusion: args.conclusion || (result.is_error ? 'failure' : result.subtype === 'success' ? 'success' : 'unknown'),
  model: init.model || args.model || null,
  costUsd: typeof result.total_cost_usd === 'number' ? +result.total_cost_usd.toFixed(4) : null,
  durationMs: result.duration_ms ?? null,
  apiDurationMs: result.duration_api_ms ?? null,
  turns: result.num_turns ?? null,
  tokens: {
    input: usage.input_tokens ?? 0,
    output: usage.output_tokens ?? 0,
    cacheRead: usage.cache_read_input_tokens ?? 0,
    cacheWrite: usage.cache_creation_input_tokens ?? 0,
  },
  toolCalls: Object.values(toolCounts).reduce((a, b) => a + b, 0),
  toolCounts,
  excerpts,
  verdict: args.verdict || null,
};

await mkdir(join(outDir, 'runs'), { recursive: true });
await mkdir(join(outDir, 'traces'), { recursive: true });
await writeFile(join(outDir, 'runs', `${id}.json`), JSON.stringify(record, null, 2));
await writeFile(join(outDir, 'traces', `${id}.json`), JSON.stringify({ id, steps: trace.slice(0, 400) }));
console.log(`Telemetry: ${role} run ${id} — $${record.costUsd ?? '?'} · ${record.turns ?? '?'} turns · ${record.toolCalls} tool calls`);
