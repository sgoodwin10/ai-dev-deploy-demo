// Captures desktop + mobile screenshots (light + dark) of site/ so agents can SEE their work.
// Also fails if the page logs console errors or scrolls horizontally on mobile.
//
// Env:
//   SHOT_DIR     output directory (default: screenshots)
//   SHOT_FORMAT  png | jpeg (default: png; deploy uses jpeg to keep the evolution archive small)
//   SHOT_STRICT  0 to report QA problems without failing (default: 1)
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

const DIR = process.env.SHOT_DIR || 'screenshots';
const FORMAT = process.env.SHOT_FORMAT === 'jpeg' ? 'jpeg' : 'png';
const STRICT = process.env.SHOT_STRICT !== '0';

const server = await serve(4173);
const browser = await chromium.launch();
await mkdir(DIR, { recursive: true });

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
];
const problems = [];

for (const vp of viewports) {
  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: vp, colorScheme: scheme, reducedMotion: 'reduce' });
    page.on('console', (m) => m.type() === 'error' && problems.push(`[${vp.name}/${scheme}] console: ${m.text()}`));
    page.on('pageerror', (e) => problems.push(`[${vp.name}/${scheme}] error: ${e.message}`));
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500); // let charts/animations settle
    const suffix = scheme === 'light' ? '' : '-dark';
    const ext = FORMAT === 'jpeg' ? 'jpg' : 'png';
    await page.screenshot({
      path: `${DIR}/${vp.name}${suffix}.${ext}`,
      fullPage: true,
      type: FORMAT,
      ...(FORMAT === 'jpeg' ? { quality: 72 } : {}),
    });
    if (vp.name === 'mobile') {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      if (overflow) problems.push(`[mobile/${scheme}] horizontal scroll detected`);
    }
    await page.close();
  }
}

await browser.close();
server.close();

if (problems.length) {
  console.error('Screenshot QA problems:\n' + problems.join('\n'));
  if (STRICT) process.exit(1);
}
console.log(`Screenshots written to ${DIR}/ (desktop, mobile, + -dark variants)`);
