import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  buildApiUrl,
  compareReports,
  formatBytes,
  formatTime,
  normalizeUrl,
  parseReport,
  type Device,
  type Report,
} from './report';
import { example } from './example';
import { colors, exportCard } from './card';
import './style.css';

type Snapshot = { report: Report; source: string; illustrative: boolean };
const dateLabel = (date: string) =>
  date && Number.isFinite(Date.parse(date))
    ? new Date(date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Date unavailable';
function resourceLabel(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname;
  } catch {
    return url.slice(0, 100);
  }
}

function App() {
  const isLocal = ['127.0.0.1', 'localhost', '[::1]'].includes(window.location.hostname);
  const [engine, setEngine] = useState(isLocal ? 'local' : 'google');
  const [url, setUrl] = useState('');
  const [device, setDevice] = useState<Device>('mobile');
  const [key, setKey] = useState('');
  const [current, setCurrent] = useState<Snapshot | null>(null);
  const [baseline, setBaseline] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [type, setType] = useState('All types');
  const controller = useRef<AbortController | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  function show(value: unknown, source: string, illustrative = false) {
    setCurrent({ report: parseReport(value), source, illustrative });
    setError('');
    setFilter('');
    setType('All types');
  }
  async function analyze(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    let target: string;
    try {
      target = normalizeUrl(url);
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    setBusy(true);
    const request = new AbortController();
    controller.current = request;
    const timeout = setTimeout(() => request.abort('timeout'), 150000);
    try {
      if (engine === 'local') {
        const localResponse = await fetch(`${import.meta.env.BASE_URL}api/audit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: target, device }),
          signal: request.signal,
        });
        if (localResponse.status === 404)
          throw new Error(
            'The local engine is unavailable. Start this project with npm run dev or npm run preview.',
          );
        const localResult = await localResponse.json();
        if (!localResponse.ok)
          throw new Error(localResult.error || 'Local Lighthouse could not finish this audit.');
        show(localResult, 'Local Lighthouse');
        return;
      }
      const response = await fetch(buildApiUrl(target, device, key), {
        signal: request.signal,
        referrerPolicy: 'no-referrer',
        credentials: 'omit',
      });
      if (response.status === 429)
        throw new Error(
          'Google’s PageSpeed quota is exhausted. Add your own API key or import a Lighthouse JSON report.',
        );
      if (response.status === 400 || response.status === 403)
        throw new Error(
          'Google could not authorize this audit. Check the URL, API key, and PageSpeed API restrictions, or import a Lighthouse report.',
        );
      if (!response.ok)
        throw new Error(
          'Google could not finish this audit. Try again later or import a Lighthouse JSON report.',
        );
      show(await response.json(), 'PageSpeed Insights');
    } catch (e) {
      setError(
        request.signal.aborted
          ? request.signal.reason === 'timeout'
            ? 'The audit timed out. Try again or import a Lighthouse report.'
            : 'Audit canceled. You can start another run.'
          : e instanceof TypeError
            ? engine === 'local'
              ? 'Could not reach the local audit engine. Restart npm run dev and try again.'
              : 'Could not reach PageSpeed Insights. Check your connection or import a Lighthouse report.'
            : (e as Error).message,
      );
    } finally {
      clearTimeout(timeout);
      controller.current = null;
      setBusy(false);
    }
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error('Choose a Lighthouse JSON report smaller than 20 MB.');
      let value: unknown;
      try {
        value = JSON.parse(await file.text());
      } catch {
        throw new Error(
          'This file is not valid JSON. Export a JSON report from Lighthouse and try again.',
        );
      }
      show(value, 'Imported report');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }
  const report = current?.report;
  const comparison = baseline && report ? compareReports(baseline.report, report) : null;
  const displayed =
    report?.requests.filter(
      (row) =>
        (type === 'All types' || row.group === type) &&
        row.url.toLowerCase().includes(filter.toLowerCase()),
    ) ?? [];
  const timed = report?.requests.filter((row) => row.start !== null && row.duration !== null) ?? [];
  const end = timed.reduce((latest, row) => Math.max(latest, row.start! + row.duration!), 1);
  const totalGrouped = report?.groups.reduce((sum, g) => sum + g.bytes, 0) ?? 0;
  const delta = (value: number | null, unit: 'time' | 'bytes' | 'score') =>
    value === null
      ? 'Unavailable'
      : `${value > 0 ? '+' : value < 0 ? '-' : ''}${unit === 'bytes' ? formatBytes(Math.abs(value)) : unit === 'time' ? formatTime(Math.abs(value)) : Math.abs(value) + ' pts'}`;

  return (
    <>
      <header className="masthead">
        <a className="brand" href="./" aria-label="RIVO PageScope home">
          <img
            className="brand-wordmark"
            src={`${import.meta.env.BASE_URL}brand/rivo-wordmark-dark.png`}
            alt="RIVO"
          />
          <span className="brand-product">PageScope</span>
        </a>
        <a
          className="source-link"
          href="https://github.com/VitorRodi/rivo-pagescope"
          target="_blank"
          rel="noreferrer"
        >
          Source on GitHub ↗
        </a>
      </header>
      <main>
        <section className="intro">
          <div>
            <p className="eyebrow">A LIGHTHOUSE REPORT, MADE VISIBLE</p>
            <h1>
              Every byte has
              <br />a backstory.
            </h1>
            <p className="intro-copy">
              See what makes your website heavy.
              <br />
              Find the files worth a closer look.
            </p>
          </div>
          <div className="intro-note">
            <span className="mini-bars" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            <p>
              One page. Its moving parts.
              <br />A clearer next step.
            </p>
          </div>
        </section>
        <section className="audit-panel" aria-label="Start an analysis">
          <form onSubmit={analyze}>
            <div className="url-field">
              <label htmlFor="website">Website URL</label>
              <input
                id="website"
                placeholder="https://your-website.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                disabled={busy}
                autoComplete="url"
              />
            </div>
            <div className="engine-field">
              <label htmlFor="engine">Audit engine</label>
              <select
                id="engine"
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                disabled={busy}
              >
                {isLocal && <option value="local">Local Chrome · no key</option>}
                <option value="google">Google PageSpeed</option>
              </select>
            </div>
            <div className="device-field">
              <label htmlFor="device">Test device</label>
              <select
                id="device"
                value={device}
                onChange={(e) => setDevice(e.target.value as Device)}
                disabled={busy}
              >
                <option value="mobile">Mobile</option>
                <option value="desktop">Desktop</option>
              </select>
            </div>
            <button className="primary" disabled={busy}>
              {busy ? 'Analyzing…' : 'Analyze website'}
              <span aria-hidden="true"> ↗</span>
            </button>
          </form>
          <div className="audit-options">
            <div className="button-row">
              <button
                className="text-button"
                onClick={() => fileInput.current?.click()}
                disabled={busy}
              >
                Import Lighthouse JSON
              </button>
              <span className="separator">/</span>
              <button
                className="text-button"
                onClick={() => {
                  setBaseline(null);
                  show(example, 'Illustrative example', true);
                }}
                disabled={busy}
              >
                Explore example
              </button>
            </div>
            <span className="subtle">Imported files stay in this tab.</span>
          </div>
          <input
            className="visually-hidden"
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            aria-label="Import Lighthouse JSON"
            tabIndex={-1}
            disabled={busy}
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
          <details className="api-options">
            <summary>API key & how this works</summary>
            <p>
              Local Chrome runs Lighthouse on this computer in a temporary browser profile. No
              Google API key is needed. Google PageSpeed sends the website address to Google; its
              public quota can run out. You can also import a report exported from Chrome DevTools →
              Lighthouse → Save as JSON.
            </p>
            <label htmlFor="api-key">Your PageSpeed API key (optional)</label>
            <input
              id="api-key"
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="Kept in memory; sent only to Google"
              disabled={busy}
            />
            <p>
              We do not store reports or keys. Restrict browser keys to your website origin and the
              PageSpeed Insights API. Treat exported reports as potentially sensitive: they can
              contain URLs and query parameters.
            </p>
            <p>
              Choose Local Chrome above when running this app with npm run dev or npm run preview.
              The command <code>npm run audit -- https://your-website.com</code> and JSON import
              remain available as alternatives.
            </p>
          </details>
          {busy && (
            <div className="status" role="status">
              <span className="spinner" aria-hidden="true" />
              {engine === 'local'
                ? 'Chrome is running Lighthouse on this computer.'
                : 'Google is running a lab test.'}{' '}
              This can take up to two minutes.
              <button
                className="text-button"
                type="button"
                onClick={() => controller.current?.abort('cancel')}
              >
                Cancel
              </button>
            </div>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </section>

        {!report && (
          <section className="empty-state">
            <span className="empty-icon" aria-hidden="true">
              ▤
            </span>
            <div>
              <h2>Start with a URL. Or bring your own report.</h2>
              <p>
                Explore resource weight, lab metrics, and the request timeline. Compare another run
                after making a change.
              </p>
            </div>
            <span className="empty-tag">No account needed</span>
          </section>
        )}
        {report && current && (
          <div className="results" aria-live="polite">
            <div className="report-header">
              <div>
                <p className="eyebrow">{current.source}</p>
                <h2 className="site-name">{new URL(report.url).hostname}</h2>
                <p className="report-meta">
                  {report.device} · Lighthouse {report.version} ·{' '}
                  {current.illustrative
                    ? 'Synthetic data for exploring the interface'
                    : dateLabel(report.date)}
                </p>
              </div>
              <div className="button-row">
                <button
                  className="secondary"
                  onClick={() => setBaseline(current)}
                  disabled={busy || current.illustrative}
                >
                  Set as baseline
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    void exportCard(report, current.source, current.illustrative).catch((e) =>
                      setError(e.message),
                    )
                  }
                >
                  Export PNG card
                </button>
              </div>
            </div>
            {current.illustrative && (
              <p className="notice">
                This is a hand-authored example, not a measured audit. Analyze a URL or import a
                report for real results.
              </p>
            )}
            {report.warnings.length > 0 && (
              <div className="notice">
                <strong>Lighthouse run warnings</strong>
                <ul>
                  {report.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {baseline && (
              <section className="comparison">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">BASELINE: {dateLabel(baseline.report.date)}</p>
                    <h2>Before → after</h2>
                  </div>
                  <button className="text-button" onClick={() => setBaseline(null)}>
                    Clear baseline
                  </button>
                </div>
                <p>
                  Baseline stays in memory. Run another audit or import a second report to compare.
                </p>
                {comparison && (
                  <>
                    <div className="comparison-grid">
                      <div>
                        <span>Transferred bytes</span>
                        <strong>{delta(comparison.bytes, 'bytes')}</strong>
                      </div>
                      <div>
                        <span>Largest contentful paint</span>
                        <strong data-testid="lcp-delta">{delta(comparison.lcp, 'time')}</strong>
                      </div>
                      <div>
                        <span>Total blocking time</span>
                        <strong>{delta(comparison.tbt, 'time')}</strong>
                      </div>
                      <div>
                        <span>Performance score</span>
                        <strong>{delta(comparison.score, 'score')}</strong>
                      </div>
                    </div>
                    <p className="subtle">
                      Negative bytes and timings mean less. A positive score means higher. One run
                      cannot prove an improvement.
                    </p>
                    {comparison.warnings.map((w) => (
                      <p className="notice" key={w}>
                        {w}
                      </p>
                    ))}
                  </>
                )}
              </section>
            )}
            <div className="workbench">
              <section className="panel weight-panel">
                <div className="section-heading">
                  <h2>Where the weight comes from</h2>
                  <span className="tag">Transferred bytes</span>
                </div>
                <div className="weight-total">
                  {formatBytes(report.totalBytes)}
                  <span>
                    {report.requests.length
                      ? `${report.requests.length} recorded requests`
                      : 'Request details unavailable'}
                  </span>
                </div>
                <div
                  className="weight-strip"
                  role="img"
                  aria-label={report.groups
                    .map((g) => `${g.name}: ${formatBytes(g.bytes)}`)
                    .join(', ')}
                >
                  {report.groups
                    .filter((g) => g.bytes > 0)
                    .map((g) => (
                      <div
                        key={g.name}
                        style={{
                          width: `${(g.bytes / totalGrouped) * 100}%`,
                          backgroundColor: colors[g.name],
                        }}
                        title={`${g.name}: ${formatBytes(g.bytes)}`}
                      />
                    ))}
                </div>
                <div className="resource-legend">
                  {report.groups.map((g) => (
                    <div key={g.name}>
                      <span className="legend-name">
                        <i style={{ backgroundColor: colors[g.name] }} />
                        {g.name}
                      </span>
                      <span>
                        {formatBytes(g.bytes)}
                        <small>
                          {totalGrouped > 0
                            ? Math.round((g.bytes / totalGrouped) * 100) + '%'
                            : '—'}
                        </small>
                      </span>
                    </div>
                  ))}
                </div>
                <p className="subtle">
                  Transfer size includes network overhead and compression. Cached resources may
                  transfer zero bytes.
                </p>
              </section>
              <section className="panel metric-panel">
                <div className="section-heading">
                  <h2>The lab snapshot</h2>
                  <span className="score">
                    {report.score ?? '—'}
                    <small>/100</small>
                  </span>
                </div>
                <dl className="metrics">
                  <div>
                    <dt>
                      Largest contentful paint <small>Main content appears</small>
                    </dt>
                    <dd>{formatTime(report.metrics.lcp)}</dd>
                  </div>
                  <div>
                    <dt>
                      First contentful paint <small>First content appears</small>
                    </dt>
                    <dd>{formatTime(report.metrics.fcp)}</dd>
                  </div>
                  <div>
                    <dt>
                      Total blocking time <small>Long tasks block interaction</small>
                    </dt>
                    <dd>{formatTime(report.metrics.tbt)}</dd>
                  </div>
                  <div>
                    <dt>
                      Cumulative layout shift <small>Visual stability · unitless</small>
                    </dt>
                    <dd>
                      {report.metrics.cls === null ? 'Unavailable' : report.metrics.cls.toFixed(3)}
                    </dd>
                  </div>
                </dl>
                <p className="subtle">
                  A single Lighthouse lab run. These are not real-user Core Web Vitals. TBT is not
                  INP.
                </p>
              </section>
            </div>
            <section className="panel timeline-panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">THE LOAD, FILE BY FILE</p>
                  <h2>Request timeline</h2>
                </div>
                <span className="tag">Observed network timings</span>
              </div>
              <div className="filters">
                <input
                  aria-label="Filter requests"
                  placeholder="Find a file or domain…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <select
                  aria-label="Resource type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  {['All types', ...report.groups.map((g) => g.name)].map((name) => (
                    <option key={name}>{name}</option>
                  ))}
                </select>
                <span className="subtle">
                  {displayed.length} of {report.requests.length} requests
                </span>
              </div>
              <div className="timeline-table">
                <div className="timeline-heading">
                  <span>RESOURCE</span>
                  <span>TRANSFER</span>
                  <span>
                    START → FINISH <small>0 → {formatTime(end)}</small>
                  </span>
                </div>
                {displayed.slice(0, 100).map((row, i) => (
                  <div className="request-row" key={row.url + i}>
                    <div className="request-name" title={row.url}>
                      <i style={{ backgroundColor: colors[row.group] }} />
                      <span>
                        {resourceLabel(row.url)}
                        <small>{row.group}</small>
                      </span>
                    </div>
                    <span className="bytes">{formatBytes(row.bytes)}</span>
                    <div className="track">
                      {row.start !== null && row.duration !== null ? (
                        <div
                          className="request-bar"
                          style={{
                            left: `${(row.start / end) * 100}%`,
                            width: `${Math.max(0.4, (row.duration / end) * 100)}%`,
                            backgroundColor: colors[row.group],
                          }}
                          title={`Starts ${formatTime(row.start)} · duration ${formatTime(row.duration)}`}
                        />
                      ) : (
                        <span className="subtle">Timing unavailable</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {!displayed.length && (
                <p className="subtle">
                  {report.requests.length
                    ? 'No requests match this filter.'
                    : 'This export has no network-request rows. Export a full Lighthouse JSON report to see the timeline.'}
                </p>
              )}
              {displayed.length > 100 && (
                <p className="subtle">
                  Showing the first 100 matches. Filter by file or resource type to narrow the list.
                </p>
              )}
              <p className="subtle">
                Bars show observed requests, including overlaps. They do not represent the simulated
                LCP calculation or a critical-path analysis.
              </p>
            </section>
            <section className="panel opportunities">
              <div className="section-heading">
                <h2>What to investigate next</h2>
                <span className="tag">Lighthouse estimates</span>
              </div>
              {report.opportunities.length ? (
                report.opportunities.map((item, i) => (
                  <div className="opportunity" key={i}>
                    <span>{item.title}</span>
                    <strong>
                      {[
                        item.bytes ? formatBytes(item.bytes) : '',
                        item.ms ? formatTime(item.ms) : '',
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </strong>
                  </div>
                ))
              ) : (
                <p className="subtle">
                  This export has no supported savings estimates. Review the largest resources and
                  the original Lighthouse report for more diagnostics.
                </p>
              )}
              <p className="subtle">
                Savings estimates overlap. Do not add them together or treat them as guaranteed
                speedups.
              </p>
            </section>
          </div>
        )}
        <footer>
          <p>
            RIVO PageScope. Built by{' '}
            <a href="https://github.com/VitorRodi" target="_blank" rel="noreferrer">
              Vitor Rodi
            </a>
            . Open source, powered by Lighthouse.
          </p>
          <p>No tracking. No account. Reports disappear when you close this tab.</p>
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById('root')!).render(<App />);
