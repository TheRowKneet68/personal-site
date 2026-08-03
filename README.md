# TheRowKneet — personal site

Ronit Baniya Gupta's personal site. React + Vite frontend, Express + Supabase backend.

## run it

```
npm install
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:3001

## build

```
npm run build   # syncs data -> embedded snapshot, regenerates resume + sitemap, then tsc + vite build
```

## env

The whole project uses a single `.env` at the repo root (never committed):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` — Supabase
- `ADMIN_PASSWORD` — admin panel, min 12 chars
- `PORT` — local API server
- optional: `GITHUB_TOKEN`, `GITHUB_USER`, `CORS_ORIGINS`, `IP_GEOLOCATION`

The server locates it from any working directory; the frontend (`Vite`) picks up `VITE_*` vars from the same file automatically. Import this same `.env` into Vercel (`Project -> Settings -> Environment Variables -> Import .env`).

The API runs in two modes automatically:

- **Supabase** — durable backend, used when `SUPABASE_URL` + a key are set. Apply `supabase/schema.sql` (enables RLS) and seed with `npm run server:seed`.
- **JSON fallback** — reads `data.json` and writes dynamic data to `server/data.dynamic.json`, so the whole stack runs with zero credentials. The admin save/upload features write to disk and will not work on a read-only filesystem.

## admin panel

http://localhost:3000/admin

- Set a strong `ADMIN_PASSWORD` (min 12 chars) in `.env`. There is **no default password** — the panel stays disabled until one is set.
- Password is exchanged for a signed, expiring bearer token (12h); the token lives in `localStorage` and is required on every admin API call.

## structure

```
src/                 React frontend (Vite)
server/              Express API (routes, controllers, services, middleware)
api/index.ts         Vercel serverless entry
supabase/schema.sql  Tables + RLS policies
public/              Static assets (images, fonts, resume, robots, sitemap)
scripts/             build-time generators (sitemap, resume PDF, data snapshot)
data.json            Content source of truth
```

## deploy

Vercel: the frontend builds to `dist/`, `/api/*` rewrites to the Express function. Set the env vars in the Vercel dashboard (Production + Preview) and redeploy. Keep `ADMIN_PASSWORD` and `SUPABASE_SERVICE_ROLE_KEY` server-side only — they must never be prefixed `VITE_` or they leak into the client bundle.
