import { normalizeUrl } from '../src/report.ts';

/** @param {(url: string, device: string, signal: AbortSignal) => Promise<unknown>} [runAudit] */
export function createAuditMiddleware(
  runAudit = async (...args) => {
    const { runLocalAudit } = await import('./lighthouse-runner.mjs');
    return runLocalAudit(...args);
  },
) {
  let active = false;
  return async (req, res, next) => {
    if (req.url !== '/api/audit') return next();
    const send = (status, body) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(JSON.stringify(body));
    };
    const port = req.socket.localPort;
    const hosts = [`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`];
    const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
    if (
      !loopback ||
      !hosts.includes(req.headers.host) ||
      req.headers.origin !== `http://${req.headers.host}`
    ) {
      return send(403, { error: 'Local audits only accept requests from this local application.' });
    }
    if (req.method !== 'POST') return send(405, { error: 'Use POST for a local audit.' });
    if (req.headers['content-type']?.split(';')[0] !== 'application/json')
      return send(415, { error: 'Send a JSON audit request.' });
    let target, device;
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk.toString();
        if (Buffer.byteLength(body) > 4096)
          return send(413, { error: 'The audit request is too large.' });
      }
      const input = JSON.parse(body);
      target = normalizeUrl(input.url);
      device = input.device;
      if (!['mobile', 'desktop'].includes(device)) throw new Error('Choose mobile or desktop.');
    } catch {
      return send(400, { error: 'Enter a valid public URL and choose mobile or desktop.' });
    }
    if (active)
      return send(409, {
        error: 'Another local audit is running. Wait for it to finish or cancel it.',
      });
    active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('timeout'), 120000);
    res.on('close', () => {
      if (!res.writableEnded) controller.abort('client disconnected');
    });
    try {
      const report = await runAudit(target, device, controller.signal);
      send(200, report);
    } catch {
      send(controller.signal.aborted ? 504 : 500, {
        error: controller.signal.aborted
          ? 'The local audit timed out. Try again.'
          : 'Local Lighthouse could not finish. Check that Google Chrome is installed and the website is reachable.',
      });
    } finally {
      clearTimeout(timeout);
      active = false;
    }
  };
}
