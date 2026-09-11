# UrbanFlow Analytics dashboard

Reusable React application shell and sample Overview for the SLIIT Codefest Datathon 2026.

## Run the dashboard

Use Node.js 22 LTS or newer. Open a PowerShell terminal and run:

```powershell
cd E:\SLIIT_Bacholer\Datathon2026\UrbanFlow-Datathon\dashboard
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173). Keep the terminal open; press Ctrl+C to stop. The preview runs independently and does not require FastAPI, Python, datasets, or trained models.

From a terminal already inside `dashboard`:

```sh
npm install
npm run dev
```

Open http://localhost:5173. Production: `npm run build`. Interaction checks: `npx playwright install chromium` then `npm run test:e2e`.

All displayed values, trends, provider names, zones and insights are illustrative. Global filters keep workspace state but do not recompute data. Navigation opens a shared planned-module state for future pages. No backend requests, trained models or live map service are used.

See [design system](../docs/design-system.md) for tokens, component APIs and extension rules.

To use installed Chrome instead of downloading Chromium in PowerShell: `$env:PLAYWRIGHT_CHANNEL="chrome"; npm run test:e2e`.
