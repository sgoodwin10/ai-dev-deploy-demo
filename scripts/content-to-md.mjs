// Renders site/content/how-it-works.json → docs/HOW-IT-WORKS.md (readable on GitHub, easy to proofread).
// Run: npm run content:md
import { readFileSync, writeFileSync } from 'node:fs';

const c = JSON.parse(readFileSync('site/content/how-it-works.json', 'utf8'));
const L = [];
const p = (...xs) => L.push(...xs);
const cell = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

p('<!-- GENERATED from site/content/how-it-works.json by `npm run content:md`. Edit the JSON, not this file. -->', '');
p('# How it works', '', `**${c.intro.headline}**`, '', c.intro.summary, '');
p('## For leadership', '', ...c.intro.forLeadership.map((x) => `- ${x}`), '');

p(`## ${c.workflow.title}`, '', c.workflow.summary, '');
p('```', c.workflow.stages.map((s) => `${s.step}. ${s.name}`).join('  →  '), '```', '');
for (const s of c.workflow.stages) {
  p(`### ${s.step}. ${s.name}`, '',
    `- **Who:** ${s.who}`, `- **Trigger:** ${s.trigger}`, `- **What happens:** ${s.what}`,
    `- **Output:** ${s.output}`, `- **Where a human can step in:** ${s.humanControl}`, '');
}
p('**Key points**', '', ...c.workflow.keyPoints.map((x) => `- ${x}`), '');

p(`## ${c.waysToWork.title}`, '', c.waysToWork.summary, '');
for (const w of c.waysToWork.paths) {
  p(`### ${w.title}`, '', `*Best for:* ${w.bestFor}`, '', ...w.steps.map((s, i) => `${i + 1}. ${s}`), '',
    '```', w.example, '```', '');
  if (w.note) p(`> ${w.note}`, '');
}

p('## The AI team', '', '| Role | In one line | Triggered by | Does | Can\'t |', '|---|---|---|---|---|',
  ...c.team.map((t) => `| **${t.role}** | ${cell(t.oneLiner)} | ${cell(t.trigger)} | ${cell(t.does)} | ${cell(t.cannot)} |`), '');

p('## The stack', '', '| Tool | Role | Detail |', '|---|---|---|',
  ...c.stack.map((s) => `| **${s.name}** | ${cell(s.role)} | ${cell(s.detail)} |`), '');

p(`## ${c.safety.title}`, '', ...c.safety.items.map((s) => `- **${s.title}.** ${s.detail}`), '');

p(`## ${c.whenThingsGoWrong.title}`, '', '| If… | Then… |', '|---|---|',
  ...c.whenThingsGoWrong.scenarios.map((s) => `| ${cell(s.scenario)} | ${cell(s.whatHappens)} |`), '');

p(`## ${c.customising.title}`, '', '| Where | Affects | Example |', '|---|---|---|',
  ...c.customising.layers.map((l) => `| \`${l.where}\` | ${cell(l.affects)} | ${cell(l.example)} |`), '', c.customising.note, '');

p(`## ${c.faq.title}`, '', c.faq.intro, '');
for (const f of c.faq.items) {
  p(`### ${f.q}`, '', `${f.asked ? '*Asked during the build* · ' : ''}*For: ${f.audience}*`, '', f.a, '');
}

p('## Glossary', '', ...c.glossary.map((g) => `- **${g.term}** — ${g.meaning}`), '');
writeFileSync('docs/HOW-IT-WORKS.md', L.join('\n'));
console.log('Wrote docs/HOW-IT-WORKS.md');
