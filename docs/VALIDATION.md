# Initial validation — 20 October 2026

Verified on Windows with Node 22.22.2 and Google Chrome, using a temporary headless browser profile.

- `npm test`: 22 passing tests.
- `npm run build`: TypeScript checking and Vite production build completed.
- `npm run test:e2e`: 5 passing browser flows: illustrative report/filter/PNG download, local import and baseline comparison, quota error and storage behavior, successful API response contract, mobile layout and invalid import.
- `npm audit`: no reported vulnerabilities at validation time; this is a point-in-time package check, not a security certification.
- Actual `npm run audit -- https://example.com` completed with Lighthouse 13.5.0. Its report contained 2 network request rows and 2,145 transferred bytes in this run. The parser accepted it and the browser imported it with no page errors. This is compatibility evidence, not a benchmark or a performance improvement claim.
- A direct, unauthenticated PageSpeed API request returned HTTP 429 (daily quota exhausted). The real Google success path with a user API key was not exercised. The success response rendering test uses a controlled fixture.
- Desktop (1440 px) and mobile (390 px) screenshots were inspected. The showcase screenshot and exported sample card use prominently labeled synthetic data. `measured-report.png` shows the imported real example.com run.

No report, API key, private project file, or signed-in browser profile is committed. The generated raw report remains in the gitignored `reports/` folder.

This repository publishes source code. No hosted deployment or LinkedIn publication is implied.

## RIVO identity revision

Renamed to RIVO PageScope, with repository URL `https://github.com/VitorRodi/rivo-pagescope`. Applied the existing RIVO black/white/graphite/silver palette, original wordmark and app icon, and locally bundled Inter. The font license is included. Runtime, comparison logic, and measurement boundaries are unchanged. Desktop, mobile, measured-import, and sample-card images were refreshed for the RIVO theme.

## Fix: URL analysis without Google quota

The original Analyze website button depended on Google even when running locally. Browser reproduction confirmed HTTP 429. Local Chrome is now the default engine on localhost and the Vite dev/preview server runs Lighthouse directly, returning its measured report to the interface. This is a local capability, not a hosted public audit service. Google remains an explicit alternative for static deployments.

The local endpoint has regression checks for same-origin access, URL/device validation, and recovery from a Chrome failure. A separate regression catches Chrome launcher cleanup returning void on Windows, which must not discard a completed report. Browser tests cover local engine selection with no Google request; an actual Chrome audit is verified separately, without a fixture, via the interface.

Final local verification: 30 unit/integration tests and 6 browser tests passed; TypeScript/Vite production build passed. Clicking Analyze website for `https://example.com` in the actual browser returned HTTP 200 from `/api/audit`, displayed `Local Lighthouse` with 2 recorded requests, and made no PageSpeed API request. See `local-audit-verified.png`. Google mode continues to depend on Google quota; static hosting does not acquire a Chrome backend from this change.

## General page review

32 unit/integration tests and 9 browser flows passed, with a successful production build. New regression checks cover explicit hostname ports, an HTML response in place of the local engine, sorting by transferred size, passed audits excluded from opportunities, and mobile wrapping of long URL warnings. Two live desktop audits of the Chrome Lighthouse documentation page returned 120 network requests; mobile rendering of those real reports was verified without horizontal overflow or browser errors. The two runs were not an optimization experiment: no code was changed on the audited page, and their deltas must not be presented as improvements.
