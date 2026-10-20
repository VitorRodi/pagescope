import { expect, it, vi } from 'vitest';
import { runLocalAudit } from '../scripts/lighthouse-runner.mjs';

// Chrome and the website audit are external boundaries. On Windows kill() can return void.
vi.mock('chrome-launcher', () => ({ launch: async () => ({ port: 9234, kill() {} }) }));
vi.mock('lighthouse', () => ({
  default: async () => ({
    lhr: { lighthouseVersion: '13.5.0', finalDisplayedUrl: 'https://example.com/' },
  }),
}));
it('returns the completed report when Chrome cleanup returns void', async () => {
  const report = await runLocalAudit('https://example.com/', 'mobile');
  expect(report.lighthouseVersion).toBe('13.5.0');
  expect(report.finalDisplayedUrl).toBe('https://example.com/');
});
