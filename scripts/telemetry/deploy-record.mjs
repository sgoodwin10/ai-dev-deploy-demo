#!/usr/bin/env node
// Records a production deploy (+ metadata for the screenshots taken of that version).
// Usage: node scripts/telemetry/deploy-record.mjs --status success|failure --id <version-id>
import { writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') && acc.push([a.slice(2), all[i + 1]]), acc), []),
);
const env = process.env;
const out = join(env.RUNNER_TEMP || '/tmp', 'telemetry-out');
const id = args.id;
const sh = (c) => { try { return execSync(c, { encoding: 'utf8' }).trim(); } catch { return ''; } };

const subject = sh('git log -1 --format=%s');
const committedAt = sh('git log -1 --format=%cI');
const pr = Number((subject.match(/\(#(\d+)\)\s*$/) || [])[1]) || null;
const startedAt = env.JOB_STARTED_AT || null;

const record = {
  schema: 1,
  id,
  sha: env.GITHUB_SHA,
  title: subject.replace(/\s*\(#\d+\)\s*$/, ''),
  pr,
  status: args.status,
  committedAt,
  startedAt,
  finishedAt: new Date().toISOString(),
  url: env.SITE_URL || null,
  runUrl: `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`,
};

await mkdir(join(out, 'deploys'), { recursive: true });
await writeFile(join(out, 'deploys', `${id}.json`), JSON.stringify(record, null, 2));

const shotDir = join(out, 'screenshots', id);
if (existsSync(shotDir)) {
  const images = (await readdir(shotDir)).filter((f) => /\.(png|jpe?g|webp)$/.test(f));
  await writeFile(join(shotDir, 'meta.json'), JSON.stringify({ ...record, images }, null, 2));
}
console.log(`Telemetry: deploy ${id} (${args.status})`);
