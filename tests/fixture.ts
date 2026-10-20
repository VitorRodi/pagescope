export function fixture() {
  return {
    lighthouseVersion: '13.0.0',
    requestedUrl: 'https://example.com/',
    finalDisplayedUrl: 'https://example.com/',
    fetchTime: '2026-10-20T12:00:00.000Z',
    configSettings: {
      formFactor: 'mobile',
      throttlingMethod: 'simulate',
      throttling: { rttMs: 150 },
    },
    categories: { performance: { score: 0.63 } },
    audits: {
      'largest-contentful-paint': { numericValue: 3600 },
      'first-contentful-paint': { numericValue: 1800 },
      'total-blocking-time': { numericValue: 180 },
      'cumulative-layout-shift': { numericValue: 0.04 },
      'network-requests': {
        details: {
          items: [
            {
              url: 'https://example.com/',
              resourceType: 'Document',
              transferSize: 10000,
              networkRequestTime: 0,
              networkEndTime: 120,
            },
            {
              url: 'https://example.com/app.js',
              resourceType: 'Script',
              transferSize: 90000,
              networkRequestTime: 120,
              networkEndTime: 650,
            },
            {
              url: 'https://example.com/hero.webp',
              resourceType: 'Image',
              transferSize: 200000,
              networkRequestTime: 125,
              networkEndTime: 900,
            },
          ],
        },
      },
      'unused-javascript': {
        title: 'Reduce unused JavaScript',
        score: 0.4,
        details: { overallSavingsMs: 320, overallSavingsBytes: 50000 },
      },
    },
  };
}
