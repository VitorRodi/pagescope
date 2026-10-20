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
