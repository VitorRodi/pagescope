import { createServer } from 'node:http';
import { once } from 'node:events';
import { afterEach, expect, it } from 'vitest';
import { createAuditMiddleware } from '../scripts/local-server.mjs';
import { fixture } from './fixture';

const servers: ReturnType<typeof createServer>[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
async function start(
  runAudit = async (_url: string, _device: string, _signal: AbortSignal): Promise<unknown> =>
    fixture(),
) {
  const middleware = createAuditMiddleware(runAudit);
  const server = createServer((req, res) =>
    middleware(req, res, () => {
      res.statusCode = 404;
      res.end();
    }),
  );
  servers.push(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as { port: number }).port;
  return `http://127.0.0.1:${port}`;
}
it('makes a local URL audit available without a Google API key', async () => {
  let received: unknown;
  const base = await start(async (url, device) => {
    received = { url, device };
    return fixture();
  });
  const response = await fetch(base + '/api/audit', {
    method: 'POST',
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com', device: 'desktop' }),
  });
  expect(response.status).toBe(200);
  expect((await response.json()).lighthouseVersion).toBe('13.0.0');
  expect(received).toEqual({ url: 'https://example.com/', device: 'desktop' });
});
it('rejects requests from another website before launching Chrome', async () => {
  let called = false;
  const base = await start(async () => {
    called = true;
    return fixture();
  });
  const response = await fetch(base + '/api/audit', {
    method: 'POST',
    headers: { Origin: 'https://other.example', 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com', device: 'mobile' }),
  });
  expect(response.status).toBe(403);
  expect(called).toBe(false);
});
it.each([
  { url: 'http://127.0.0.1', device: 'mobile' },
  { url: 'https://example.com', device: 'watch' },
])('rejects invalid jobs before starting Chrome', async (body) => {
  let called = false;
  const base = await start(async () => {
    called = true;
    return fixture();
  });
  const response = await fetch(base + '/api/audit', {
    method: 'POST',
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  expect(response.status).toBe(400);
  expect(called).toBe(false);
});
it('returns a useful error when Chrome cannot run and accepts another audit afterwards', async () => {
  let attempts = 0;
  const base = await start(async () => {
    if (attempts++ === 0) throw new Error('Chrome not found');
    return fixture();
  });
  const audit = () =>
    fetch(base + '/api/audit', {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com', device: 'mobile' }),
    });
  const failed = await audit();
  expect(failed.status).toBe(500);
  expect((await failed.json()).error).toMatch(/Chrome/);
  expect((await audit()).status).toBe(200);
});

it('does not launch two Chrome audits concurrently', async () => {
  let started!: () => void;
  let finish!: (value: unknown) => void;
  const running = new Promise<void>((resolve) => {
    started = resolve;
  });
  const result = new Promise((resolve) => {
    finish = resolve;
  });
  const base = await start(async () => {
    started();
    return result;
  });
  const audit = () =>
    fetch(base + '/api/audit', {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'https://example.com', device: 'mobile' }),
    });
  const first = audit();
  await running;
  try {
    expect((await audit()).status).toBe(409);
  } finally {
    finish(fixture());
  }
  expect((await first).status).toBe(200);
});

it('rejects a missing origin instead of allowing arbitrary local callers', async () => {
  let called = false;
  const base = await start(async () => {
    called = true;
    return fixture();
  });
  const response = await fetch(base + '/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com', device: 'mobile' }),
  });
  expect(response.status).toBe(403);
  expect(called).toBe(false);
});
