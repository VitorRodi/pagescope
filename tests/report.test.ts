import { describe, it, expect } from 'vitest';
import { normalizeUrl, parseReport, compareReports, buildApiUrl } from '../src/report';

import { fixture } from './fixture';

describe('URL input', () => {
  it('accepts a hostname with an explicit port without mistaking it for a URL scheme', () => {
    expect(normalizeUrl('example.com:8443/path')).toBe('https://example.com:8443/path');
  });
  it('adds HTTPS and removes fragments without dropping query parameters', () => {
    expect(normalizeUrl(' example.com/path?q=a#part ')).toBe('https://example.com/path?q=a');
  });
  it.each([
    'javascript:alert(1)',
    'http://localhost:3000',
    'https://127.0.0.1',
    'https://user:pass@example.com',
    'http://192.168.1.1',
    'https://[::1]',
    'not a domain',
  ])('rejects unsafe or non-public input %s', (value) => {
    expect(() => normalizeUrl(value)).toThrow(/public|HTTP|credentials|valid/i);
  });
  it('encodes the target URL and sends the selected device to Google', () => {
    const result = new URL(buildApiUrl('https://example.com/?a=1&b=2', 'mobile', 'key&value'));
    expect(result.origin).toBe('https://www.googleapis.com');
    expect(result.searchParams.get('url')).toBe('https://example.com/?a=1&b=2');
    expect(result.searchParams.get('strategy')).toBe('mobile');
    expect(result.searchParams.get('key')).toBe('key&value');
  });
});

describe('Lighthouse reports', () => {
  it('does not recommend a passed audit as a performance opportunity', () => {
    const input: any = fixture();
    input.audits['server-response-time'] = {
      title: 'Initial server response time was short',
      score: 1,
      details: { overallSavingsMs: 450 },
    };
    expect(
      parseReport(input).opportunities.some(
        (row) => row.title === 'Initial server response time was short',
      ),
    ).toBe(false);
  });
  it('uses resource-summary when network rows are absent, excludes its total row from category sums', () => {
    const input: any = fixture();
    delete input.audits['network-requests'];
    input.audits['resource-summary'] = {
      details: {
        items: [
          { resourceType: 'total', transferSize: 120000 },
          { resourceType: 'script', transferSize: 90000, requestCount: 2 },
          { resourceType: 'image', transferSize: 30000, requestCount: 1 },
        ],
      },
    };
    const report = parseReport(input);
    expect(report.totalBytes).toBe(120000);
    expect(report.groups.reduce((sum, row) => sum + row.bytes, 0)).toBe(120000);
    expect(report.requests).toEqual([]);
  });
  it('does not interpret absent byte data as a zero-byte page, and preserves a genuine zero score', () => {
    const input: any = fixture();
    delete input.audits['network-requests'];
    input.categories.performance.score = 0;
    const report = parseReport(input);
    expect(report.totalBytes).toBeNull();
    expect(report.score).toBe(0);
  });
  it('accepts a raw report and a PageSpeed envelope, groups transferred bytes and preserves millisecond timings', () => {
    const raw = parseReport(fixture());
    expect(parseReport({ lighthouseResult: fixture() })).toEqual(raw);
    expect(raw.totalBytes).toBe(300000);
    expect(raw.groups.find((g) => g.name === 'JavaScript')?.bytes).toBe(90000);
    expect(raw.requests[1].start).toBe(120);
    expect(raw.requests[1].duration).toBe(530);
    expect(raw.metrics.lcp).toBe(3600);
    expect(raw.score).toBe(63);
    expect(raw.opportunities[0].bytes).toBe(50000);
  });
  it('keeps missing scores and metrics unknown, and does not double count resource-summary totals', () => {
    const input: any = fixture();
    input.categories.performance.score = null;
    delete input.audits['largest-contentful-paint'];
    input.audits['resource-summary'] = {
      details: {
        items: [
          { resourceType: 'total', transferSize: 300000 },
          { resourceType: 'script', transferSize: 90000 },
        ],
      },
    };
    const report = parseReport(input);
    expect(report.score).toBeNull();
    expect(report.metrics.lcp).toBeNull();
    expect(report.totalBytes).toBe(300000);
  });
  it('supports older seconds-based timing fields', () => {
    const input: any = fixture();
    input.audits['network-requests'].details.items = [
      {
        url: 'https://example.com/',
        resourceType: 'Document',
        transferSize: 10,
        startTime: 0.2,
        endTime: 0.7,
      },
    ];
    const request = parseReport(input).requests[0];
    expect(request.start).toBe(200);
    expect(request.duration).toBe(500);
  });
  it.each([
    null,
    {},
    { audits: {} },
    { ...fixture(), runtimeError: { message: 'Page failed to load' } },
  ])('rejects invalid or failed audits', (value) => {
    expect(() => parseReport(value)).toThrow();
  });
  it('tolerates incomplete resource rows without fabricating timings or negative sizes', () => {
    const input: any = fixture();
    input.audits['network-requests'].details.items = [
      { url: 'https://example.com/a', transferSize: -3 },
      null,
    ];
    const report = parseReport(input);
    expect(report.totalBytes).toBe(0);
    expect(report.requests[0].start).toBeNull();
    expect(report.requests[0].duration).toBeNull();
  });
});

describe('before and after', () => {
  it('calculates lower-is-better deltas and refuses to call a different page comparable', () => {
    const before = parseReport(fixture());
    const input: any = fixture();
    input.audits['largest-contentful-paint'].numericValue = 2400;
    input.categories.performance.score = 0.82;
    const after = parseReport(input);
    expect(compareReports(before, after).lcp).toBe(-1200);
    expect(compareReports(before, after).score).toBe(19);
    expect(compareReports(before, after).warnings).toEqual([]);
    input.finalDisplayedUrl = 'https://other.example/';
    expect(compareReports(before, parseReport(input)).warnings.join(' ')).toMatch(/different URL/i);
  });
  it('warns about device and throttling differences and leaves missing deltas unknown', () => {
    const before = parseReport(fixture());
    const input: any = fixture();
    input.configSettings.formFactor = 'desktop';
    input.configSettings.throttling.rttMs = 40;
    delete input.audits['largest-contentful-paint'];
    const comparison = compareReports(before, parseReport(input));
    expect(comparison.warnings.join(' ')).toMatch(/device/i);
    expect(comparison.warnings.join(' ')).toMatch(/throttling/i);
    expect(comparison.lcp).toBeNull();
  });
});
