import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import desktop from 'lighthouse/core/config/desktop-config.js';

export async function runLocalAudit(url, device, signal = new AbortController().signal) {
  signal.throwIfAborted();
  const chrome = await launch({
    chromeFlags: ['--headless=new', '--disable-gpu', '--no-first-run'],
  });
  const closeChrome = async () => {
    try {
      await chrome.kill();
    } catch {
      /* The process may already be closed after cancellation. */
    }
  };
  const cancel = () => {
    void closeChrome();
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    signal.throwIfAborted();
    const result = await lighthouse(
      url,
      {
        port: chrome.port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance'],
      },
      device === 'desktop' ? desktop : undefined,
    );
    if (!result || result.lhr.runtimeError)
      throw new Error(result?.lhr.runtimeError?.message || 'Lighthouse returned no report.');
    return result.lhr;
  } finally {
    signal.removeEventListener('abort', cancel);
    await closeChrome();
  }
}
