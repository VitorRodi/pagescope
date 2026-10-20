// Hand-authored illustration, never presented as a measurement of a real website.
export const example = {
  lighthouseVersion: '13.5.0',
  requestedUrl: 'https://example.com/',
  finalDisplayedUrl: 'https://example.com/',
  configSettings: { formFactor: 'mobile', throttlingMethod: 'simulate' },
  categories: { performance: { score: 0.58 } },
  audits: {
    'largest-contentful-paint': { numericValue: 4200 },
    'first-contentful-paint': { numericValue: 1900 },
    'total-blocking-time': { numericValue: 320 },
    'cumulative-layout-shift': { numericValue: 0.06 },
    'network-requests': {
      details: {
        items: [
          {
            url: 'https://example.com/',
            resourceType: 'Document',
            transferSize: 24576,
            networkRequestTime: 0,
            networkEndTime: 240,
          },
          {
            url: 'https://example.com/assets/main.css',
            resourceType: 'Stylesheet',
            transferSize: 49152,
            networkRequestTime: 245,
            networkEndTime: 510,
          },
          {
            url: 'https://example.com/assets/app.js',
            resourceType: 'Script',
            transferSize: 327680,
            networkRequestTime: 250,
            networkEndTime: 1710,
          },
          {
            url: 'https://example.com/assets/hero.jpg',
            resourceType: 'Image',
            transferSize: 1048576,
            networkRequestTime: 530,
            networkEndTime: 3800,
          },
          {
            url: 'https://example.com/assets/catalog.webp',
            resourceType: 'Image',
            transferSize: 122880,
            networkRequestTime: 610,
            networkEndTime: 1720,
          },
          {
            url: 'https://example.com/assets/body.woff2',
            resourceType: 'Font',
            transferSize: 57344,
            networkRequestTime: 550,
            networkEndTime: 1120,
          },
          {
            url: 'https://example.com/assets/analytics.js',
            resourceType: 'Script',
            transferSize: 98304,
            networkRequestTime: 1250,
            networkEndTime: 2190,
          },
        ],
      },
    },
    'uses-optimized-images': {
      title: 'Serve images in efficient formats',
      details: { overallSavingsMs: 820, overallSavingsBytes: 640000 },
    },
    'unused-javascript': {
      title: 'Reduce unused JavaScript',
      details: { overallSavingsMs: 290, overallSavingsBytes: 170000 },
    },
  },
};
