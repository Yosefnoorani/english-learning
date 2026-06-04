# English Learning

Vite + React app for English practice (local content + browser `localStorage`).

**Deploy account:** Use **yosefnoorani@gmail.com** for GitHub, [Render](https://dashboard.render.com), and Cron-job.io (Cron is optional for Static Sites).

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

1. Create a repository on GitHub (e.g. `english-learning`).
2. Push this project:

```bash
git remote add origin https://github.com/YOUR_USER/english-learning.git
git branch -M main
git push -u origin main
```

### Render (Static Site)

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Static Site** (or **Blueprint** if using `render.yaml`).
2. Connect the GitHub repo.
3. Settings (auto-filled by `render.yaml` if using Blueprint):
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. No environment variables required for local-only mode.

**Cron-job.io:** Not needed for Static Sites (they do not sleep). Use a ping only if you deploy as a Web Service instead.

### Optional: Supabase

Copy `.env.example` to `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then add the same variables in Render for build-time injection.
