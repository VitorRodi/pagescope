import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import desktop from 'lighthouse/core/config/desktop-config.js';
import { parseArguments } from './audit-options.mjs';

let chrome;
try {
  const { url, device } = parseArguments(process.argv.slice(2));
  console.log(
    `Auditing ${url} (${device}). Chrome uses a temporary profile, not your signed-in browser.`,
  );
  chrome = await launch({ chromeFlags: ['--headless=new', '--disable-gpu', '--no-first-run'] });
  const result = await lighthouse(
    url,
    { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: ['performance'] },
    device === 'desktop' ? desktop : undefined,
  );
  if (!result || result.lhr.runtimeError)
    throw new Error(result?.lhr.runtimeError?.message || 'Lighthouse returned no report.');
  await mkdir('reports', { recursive: true });
  const file = resolve('reports', `${new URL(url).hostname}-${device}-${Date.now()}.json`);
  await writeFile(file, JSON.stringify(result.lhr, null, 2));
  console.log(`Saved ${file}\nImport this JSON file into PageScope. No API key is needed.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (chrome) await chrome.kill();
}
