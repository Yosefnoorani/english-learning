# English Learning

Vite + React app for English practice (local content + browser `localStorage`).

**Deploy account:** Use **yosefnoorani@gmail.com** for GitHub, [Render](https://dashboard.render.com), and Cron-job.io.

**Quick links:** see [DEPLOY.md](DEPLOY.md) · automated setup: `.\scripts\setup-render-and-cron.ps1` (needs API keys).

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

### GitHub

Repository: **https://github.com/Yosefnoorani/english-learning**

```bash
git push -u origin main
```

Or run `scripts/deploy-github.ps1` after `gh auth login` (account **Yosefnoorani** / **yosefnoorani@gmail.com**).

### Render (Static Site)

Sign in to [dashboard.render.com](https://dashboard.render.com) with **yosefnoorani@gmail.com** (same Google account as GitHub).

1. **New** → **Static Site** → connect **Yosefnoorani/english-learning**.
2. Branch: `main`
3. **Build Command:** `npm install && npm run build`
4. **Publish Directory:** `dist`
5. Deploy. No environment variables for local-only mode.

Or use **New Blueprint** and point at the repo — [`render.yaml`](render.yaml) sets the same values.

**Cron-job.io:** Not needed for Static Sites (they do not sleep). Skip Cron unless you use a Web Service.

### Optional: Supabase

Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then add the same variables in Render for build-time injection.
