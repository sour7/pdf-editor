# Deploying the PDF Editor

The app is a **static SPA** after `npm run build` (`dist/`). The optional Express API is **not** required for editing or export in the browser.

## Vercel (fastest)

1. Push this repo to GitHub (or use Vercel CLI with the folder).
2. Go to [vercel.com](https://vercel.com) → **Add New… → Project** → import the repo.
3. Leave defaults (Framework: Vite, Build: `npm run build`, Output: `dist`).
4. Deploy. **Do not set `VITE_BASE`** — the site lives at the domain root.

Or from this folder (opens browser to log in):

```bash
npx vercel
```

## Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site** → Import from Git, or drag-drop the `dist` folder after a local `npm run build`.
2. `netlify.toml` is already in the repo for build settings and SPA fallback.

## GitHub Pages

1. Push to GitHub (default branch `main` or `master`).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The workflow **Deploy GitHub Pages** runs on push; it sets `VITE_BASE=/<repo-name>/` so assets load under `https://<user>.github.io/<repo>/`.

If you rename the repo, the next deploy will pick up the new base path automatically.

## GitHub Actions → Vercel

Use `.github/workflows/deploy-vercel.yml` with secrets:

| Secret | Where to get it |
|--------|------------------|
| `VERCEL_TOKEN` | Vercel → Account → Tokens |
| `VERCEL_ORG_ID` | `.vercel/project.json` after `vercel link`, or team settings |
| `VERCEL_PROJECT_ID` | same |

## Custom domain / root host

Build with **`VITE_BASE` unset** or `VITE_BASE=/` so asset URLs stay at the site root.
