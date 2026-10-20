import { it, expect } from 'vitest';
import { parseArguments } from '../scripts/audit-options.mjs';
it('requires an explicit website and rejects unsupported devices before launching Chrome', () => {
  expect(() => parseArguments([])).toThrow(/usage/i);
  expect(() => parseArguments(['https://example.com', '--device=watch'])).toThrow(/device/i);
  expect(parseArguments(['https://example.com', '--device=desktop'])).toEqual({
    url: 'https://example.com/',
    device: 'desktop',
  });
});
