# TheRowKneet - personal site

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
npm run build   # syncs data -> embedded snapshot, regenerates sitemap + favicon, then tsc + vite build
```

Checks: `npm run lint`, `npm run typecheck`, and `npx tsx scripts/check-portfolio.ts` (date, placement and
cleanup helpers the homepage relies on).

## design notes

- Palette (`src/index.css` tokens): Ronit's own picks from the colour mixer, forest green #27681c on
  charcoal #18181b (dark) and off-white #fafafa (light). Red is for errors only. Dark by default;
  `<html class="light">` swaps the tokens. The first theme is picked before paint in `index.html` (saved
  choice, else the device setting); the header toggle saves the choice. `accent` is for text and lines,
  `accent-fill` + `on-accent` for filled buttons. Text tokens are >= 4.5:1 in both modes; chart series
  `--ch-1..5` are validated per mode with the dataviz palette checker against `--rk-surface`.
- Hero stats are recounted by the server on every request (`deriveStats` in `server/services/content.ts`).
  Each stat has a `source` set in /admin: projects, achievements, placements, dan badge, or typed by hand.
- `/resume.pdf` is built from the live CMS content on every request (`server/services/resume.ts`, A4, at
  most two pages). There is no static resume file any more; vercel.json rewrites the path to the API.
- Admin: each project form opens with a live preview and the essentials; the rest sits under "More
  details". `/admin#<section>` and `/admin#project=<id>` open a section or project directly, and the site
  shows "Edit" links to them in a browser that is logged in to the admin.
- Type: Bricolage Grotesque (display + body), Instrument Serif italic for the hero accent, JetBrains Mono
  only for part numbers and readouts.
- Charts (`src/components/charts/`) are plain SVG, computed from the CMS data: the hero trace, projects per
  year by field, field mix, most-used parts and the competition timeline. Each has hover/focus tooltips and
  a "Show the numbers" table. Category -> field grouping lives in `src/lib/stats.ts`.
- Project system diagrams live in `src/lib/diagrams.ts`, keyed by project id.
- Share card source: `scripts/og-card.html` (regenerate `public/images/og-card.jpg` from it).

## env

The whole project uses a single `.env` at the repo root (never committed):

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` - Supabase
- `ADMIN_PASSWORD` - admin panel, min 12 chars
- `PORT` - local API server
- optional: `GITHUB_TOKEN`, `GITHUB_USER`, `CORS_ORIGINS`, `IP_GEOLOCATION`

The server locates it from any working directory; the frontend (`Vite`) picks up `VITE_*` vars from the same file automatically. Import this same `.env` into Vercel (`Project -> Settings -> Environment Variables -> Import .env`).

The API runs in two modes automatically:

- **Supabase** - durable backend, used when `SUPABASE_URL` + a key are set. Apply `supabase/schema.sql` (enables RLS) and seed with `npm run server:seed`.
- **JSON fallback** - reads `data.json` and writes dynamic data to `server/data.dynamic.json`, so the whole stack runs with zero credentials. The admin save/upload features write to disk and will not work on a read-only filesystem.

## admin panel

http://localhost:3000/admin

- Set a strong `ADMIN_PASSWORD` (min 12 chars) in `.env`. There is **no default password** - the panel stays disabled until one is set.
- Password is exchanged for a signed, expiring bearer token (12h); the token lives in `localStorage` and is required on every admin API call.

## structure

```
src/                 React frontend (Vite)
server/              Express API (routes, controllers, services, middleware)
api/index.ts         Vercel serverless entry
supabase/schema.sql  Tables + RLS policies
public/              Static assets (images, fonts, robots, sitemap)
scripts/             build-time generators (sitemap, favicon, data snapshot)
data.json            Content source of truth
```

## deploy

Vercel: the frontend builds to `dist/`, `/api/*` rewrites to the Express function. Set the env vars in the Vercel dashboard (Production + Preview) and redeploy. Keep `ADMIN_PASSWORD` and `SUPABASE_SERVICE_ROLE_KEY` server-side only - they must never be prefixed `VITE_` or they leak into the client bundle.
