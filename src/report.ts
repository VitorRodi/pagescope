export type Device = 'mobile' | 'desktop';
export type ResourceGroup = 'Images' | 'JavaScript' | 'CSS' | 'Fonts' | 'HTML' | 'Other';
export type RequestRow = {
  url: string;
  group: ResourceGroup;
  bytes: number;
  start: number | null;
  duration: number | null;
};
export type Report = {
  url: string;
  date: string;
  version: string;
  device: string;
  settings: string;
  score: number | null;
  totalBytes: number | null;
  metrics: { lcp: number | null; fcp: number | null; tbt: number | null; cls: number | null };
  groups: { name: ResourceGroup; bytes: number; count: number }[];
  requests: RequestRow[];
  warnings: string[];
  opportunities: { title: string; ms: number; bytes: number }[];
};
type Obj = Record<string, unknown>;
const object = (x: unknown): Obj =>
  x !== null && typeof x === 'object' && !Array.isArray(x) ? (x as Obj) : {};
const number = (x: unknown): number | null =>
  typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null;
const string = (x: unknown, fallback = '') => (typeof x === 'string' ? x : fallback);
const items = (audit: unknown) => {
  const list = object(object(audit).details).items;
  return Array.isArray(list) ? list.filter((x) => x && typeof x === 'object').map(object) : [];
};

export function normalizeUrl(value: string): string {
  let url: URL;
  const input = value.trim();
  try {
    const hostnameWithPort = /^[a-z\d.-]+:\d+(?:[/?#]|$)/i.test(input);
    url = new URL(
      !hostnameWithPort && /^[a-z][a-z\d+.-]*:/i.test(input) ? input : `https://${input}`,
    );
  } catch {
    throw new Error('Enter a valid public website URL.');
  }
  if (!['https:', 'http:'].includes(url.protocol))
    throw new Error('Only HTTP and HTTPS websites are supported.');
  if (url.username || url.password)
    throw new Error('URLs containing credentials are not supported.');
  const host = url.hostname.toLowerCase();
  const octets = host.split('.').map(Number);
  const ipv4 =
    octets.length === 4 && octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
  const privateIP =
    ipv4 &&
    (octets[0] === 0 ||
      octets[0] === 10 ||
      octets[0] === 127 ||
      octets[0] >= 224 ||
      (octets[0] === 169 && octets[1] === 254) ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168) ||
      (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127));
  if (
    !host.includes('.') ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.includes(':') ||
    privateIP
  ) {
    throw new Error('Enter a public website. Local and private addresses are not supported.');
  }
  url.hash = '';
  return url.href;
}

export function buildApiUrl(url: string, device: Device, key = ''): string {
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  endpoint.searchParams.set('url', normalizeUrl(url));
  endpoint.searchParams.set('strategy', device);
  endpoint.searchParams.set('category', 'performance');
  endpoint.searchParams.set('locale', 'en');
  if (key.trim()) endpoint.searchParams.set('key', key.trim());
  return endpoint.href;
}

function group(type: unknown): ResourceGroup {
  const value = string(type).toLowerCase();
  if (['image', 'images'].includes(value)) return 'Images';
  if (['script', 'scripts'].includes(value)) return 'JavaScript';
  if (['stylesheet', 'stylesheets'].includes(value)) return 'CSS';
  if (['font', 'fonts'].includes(value)) return 'Fonts';
  if (['document', 'documents'].includes(value)) return 'HTML';
  return 'Other';
}

export function parseReport(value: unknown): Report {
  const envelope = object(value);
  const source = object(envelope.lighthouseResult ?? value);
  const audits = object(source.audits);
  const rawUrl = source.finalDisplayedUrl ?? source.finalUrl ?? source.requestedUrl;
  if (source.runtimeError)
    throw new Error(
      string(object(source.runtimeError).message, 'Lighthouse could not load this page.'),
    );
  if (!Object.keys(audits).length || typeof rawUrl !== 'string' || !source.lighthouseVersion)
    throw new Error('This file is not a completed Lighthouse JSON report.');
  let safeUrl: URL;
  try {
    safeUrl = new URL(rawUrl);
  } catch {
    throw new Error('The report has no valid page URL.');
  }
  if (!['http:', 'https:'].includes(safeUrl.protocol) || safeUrl.username || safeUrl.password)
    throw new Error('The report must describe an HTTP or HTTPS page without credentials.');
  const settings = object(source.configSettings);
  const names: ResourceGroup[] = ['Images', 'JavaScript', 'CSS', 'Fonts', 'HTML', 'Other'];
  const groups = names.map((name) => ({ name, bytes: 0, count: 0 }));
  const networkAudit = object(audits['network-requests']);
  const requests: RequestRow[] = items(networkAudit).map((row) => {
    const currentStart = number(row.networkRequestTime ?? row.rendererStartTime);
    const oldStart = number(row.startTime);
    const start = currentStart ?? (oldStart === null ? null : oldStart * 1000);
    const currentEnd = number(row.networkEndTime);
    const oldEnd = number(row.endTime);
    const end = currentEnd ?? (oldEnd === null ? null : oldEnd * 1000);
    return {
      url: string(row.url, '(unnamed resource)'),
      group: group(row.resourceType),
      bytes: number(row.transferSize) ?? 0,
      start,
      duration: start !== null && end !== null && end >= start ? end - start : null,
    };
  });
  for (const request of requests) {
    const bucket = groups.find((g) => g.name === request.group)!;
    bucket.bytes += request.bytes;
    bucket.count++;
  }
  const summary = items(audits['resource-summary']);
  // Never sum the summary's total row with its category rows.
  if (!requests.length)
    for (const row of summary) {
      if (row.resourceType === 'total') continue;
      const bucket = groups.find((g) => g.name === group(row.resourceType))!;
      bucket.bytes += number(row.transferSize) ?? 0;
      bucket.count += number(row.requestCount) ?? 0;
    }
  const measured = requests.length > 0 || summary.length > 0;
  const totalRow = summary.find((row) => row.resourceType === 'total');
  const totalBytes = measured
    ? !requests.length && totalRow
      ? number(totalRow.transferSize)
      : groups.reduce((sum, g) => sum + g.bytes, 0)
    : null;
  const score = number(object(object(source.categories).performance).score);
  const metric = (key: string) => number(object(audits[key]).numericValue);
  const opportunities = Object.values(audits)
    .map(object)
    .filter((audit) => {
      if (audit.score === 1) return false;
      const details = object(audit.details);
      return (
        (number(details.overallSavingsMs) ?? 0) > 0 ||
        (number(details.overallSavingsBytes) ?? 0) > 0
      );
    })
    .map((audit) => ({
      title: string(audit.title, 'Performance opportunity'),
      ms: number(object(audit.details).overallSavingsMs) ?? 0,
      bytes: number(object(audit.details).overallSavingsBytes) ?? 0,
    }))
    .sort((a, b) => b.ms - a.ms || b.bytes - a.bytes)
    .slice(0, 8);
  return {
    url: safeUrl.href,
    date: string(source.fetchTime),
    version: string(source.lighthouseVersion),
    device: string(settings.formFactor ?? settings.emulatedFormFactor, 'unknown'),
    settings: JSON.stringify([
      settings.throttlingMethod ?? null,
      settings.throttling ?? null,
      settings.screenEmulation ?? null,
    ]),
    score: score !== null && score <= 1 ? Math.round(score * 100) : null,
    totalBytes,
    groups,
    requests,
    metrics: {
      lcp: metric('largest-contentful-paint'),
      fcp: metric('first-contentful-paint'),
      tbt: metric('total-blocking-time'),
      cls: metric('cumulative-layout-shift'),
    },
    warnings: Array.isArray(source.runWarnings)
      ? source.runWarnings.filter((x): x is string => typeof x === 'string')
      : [],
    opportunities,
  };
}

export function compareReports(before: Report, after: Report) {
  const delta = (a: number | null, b: number | null) => (a === null || b === null ? null : b - a);
  const warnings: string[] = [];
  if (before.url !== after.url)
    warnings.push(
      'These reports describe a different URL. Changes may come from different content.',
    );
  if (before.device !== after.device || before.device === 'unknown')
    warnings.push('Device settings differ or are unknown.');
  if (before.settings !== after.settings) warnings.push('Throttling or screen settings differ.');
  if (before.version !== after.version)
    warnings.push('Lighthouse versions differ. Scores may not use the same model.');
  return {
    score: delta(before.score, after.score),
    bytes: delta(before.totalBytes, after.totalBytes),
    lcp: delta(before.metrics.lcp, after.metrics.lcp),
    tbt: delta(before.metrics.tbt, after.metrics.tbt),
    warnings,
  };
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'Unavailable';
  if (Math.abs(bytes) < 1024) return `${Math.round(bytes)} B`;
  if (Math.abs(bytes) < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
export const formatTime = (ms: number | null) =>
  ms === null ? 'Unavailable' : ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(2)} s`;
