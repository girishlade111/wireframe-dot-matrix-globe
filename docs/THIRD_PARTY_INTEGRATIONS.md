# Third-Party Integrations

Every external service, dataset, and npm package this app depends on —
what it does, where it's wired in, its install state, and what to watch
out for.

---

## Integration inventory

| # | Integration | Type | Purpose | Referenced in | Install state |
|---|---|---|---|---|---|
| 1 | **D3.js** (`d3`) | npm package | Map projection, GeoJSON path rendering, rotation timer | `components/rotating-earth.tsx` | ✅ In `package.json` |
| 2 | **Natural Earth GeoJSON** (via `martynafford/natural-earth-geojson`) | Runtime data fetch | World land-mass polygons | `components/rotating-earth.tsx` (`fetch`) | 🌐 Fetched at runtime, not installed |
| 3 | **Vercel Analytics** (`@vercel/analytics`) | npm package + Vercel service | Page-view analytics | `app/layout.tsx` (`<Analytics />`) | ⚠️ **Imported but NOT in `package.json`** |
| 4 | **Geist font** (`geist`) | npm package | Sans/mono typeface | `app/layout.tsx` (`geist/font/sans`, `geist/font/mono`) | ⚠️ **Imported but NOT in `package.json`** |
| 5 | **next-themes** | npm package | Dark-mode theming | `components/theme-provider.tsx` | ⚠️ **Imported but NOT in `package.json`; component unused** |
| 6 | **Vercel** (hosting) | Platform | Deployment + CI on push | GitHub ↔ Vercel integration | ✅ Connected (via v0) |
| 7 | **v0.app** | Platform | AI app builder; source of this repo | Repo sync | ✅ Repo auto-syncs from v0 |
| 8 | **Tailwind CSS v4** (+ `@tailwindcss/postcss`) | npm package | Utility CSS, CSS-first theming | `app/globals.css`, `postcss.config.mjs` | ✅ In `package.json` |
| 9 | **tw-animate-css** / **tailwindcss-animate** | npm packages | Animation utilities | `app/globals.css` | ✅ In `package.json` |
| 10 | **lucide-react** | npm package | Icon set (shadcn default) | `components.json` (`iconLibrary`) | ✅ Installed, currently unused in code |
| 11 | **clsx** + **tailwind-merge** + **class-variance-authority** | npm packages | `cn()` class-name utility | `lib/utils.ts` | ✅ In `package.json` |

> ⚠️ **Missing-dependency warning (items 3–5):** `app/layout.tsx` imports
> `@vercel/analytics/next` and `geist/font/*`, and
> `components/theme-provider.tsx` imports `next-themes` — but none of the
> three appear in `package.json`. A fresh `pnpm install` + `pnpm build`
> **will fail** on these imports. This works today only because the v0/Vercel
> build environment pre-installs them. Fix: `pnpm add @vercel/analytics
> geist next-themes` (or remove the imports if unneeded).

---

## 1. D3.js — the rendering engine

- **Package:** `d3` (⚠️ pinned as `"latest"` in `package.json` — see warning
  below), `@types/d3` in devDependencies.
- **Used for:**
  - `d3.geoOrthographic()` — 3D orthographic globe projection,
  - `d3.geoPath().projection(...).context(canvasCtx)` — canvas path renderer,
  - `d3.geoBounds(feature)` — per-country bounding boxes for dot sampling,
  - `d3.geoGraticule()` — lat/long grid lines,
  - `d3.timer()` — the auto-rotation frame loop.
- **Warning — `"d3": "latest"` is dangerous.** Every fresh install can pull
  a new major version with breaking API changes. Pin it:
  `pnpm add d3@7` (then it becomes `"^7.x.x"`).

## 2. Natural Earth GeoJSON — the world map data

- **URL fetched at runtime** (client-side, in the browser):
  `https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json`
- **What it is:** Natural Earth 1:110m "land" polygons (country/continent
  outlines), converted to GeoJSON by the community repo
  `martynafford/natural-earth-geojson`. 110m = lowest resolution
  (smallest file, fastest load, coarsest coastlines).
- **Why `raw.githubusercontent.com`:** it serves the file with permissive
  CORS headers, so browsers can `fetch()` it cross-origin. It is a CDN-ish
  static host, not an API — no key, no rate limit for this scale.
- **Failure mode:** if the fetch fails (offline, GitHub down), the globe
  renders the ocean + graticule only, and the component shows
  *"Failed to load land map data"*.
- **Switching resolution** (same repo layout):
  - `110m` (current) — ~small, coarse
  - `50m` — medium detail
  - `10m` — high detail (large file, slower dot generation)
- **Self-hosting (recommended for production):** download the JSON into
  `public/data/ne_110m_land.json` and fetch `/data/ne_110m_land.json`
  instead — removes the runtime dependency on GitHub's raw host and
  improves reliability. Consider adding `NEXT_PUBLIC_LAND_DATA_URL` (see
  `docs/ENVIRONMENT_AND_CONFIGURATION.md`).

## 3. Vercel Analytics

- **Code:** `<Analytics />` from `@vercel/analytics/next` in
  `app/layout.tsx` — renders a lightweight script that reports page views
  to the Vercel dashboard.
- **Setup:** zero config on Vercel (auto-enabled per project). On other
  hosts the component renders but reports nowhere.
- **Action required:** add `@vercel/analytics` to `package.json`
  (see missing-dependency warning above), or delete the import if you
  don't want analytics.

## 4. Geist font

- **Code:** `GeistSans` / `GeistMono` from `geist/font/sans` and
  `geist/font/mono`, applied as CSS variables in `app/layout.tsx`.
- **Tailwind mapping:** `--font-sans: var(--font-geist-sans)` in
  `app/globals.css` `@theme inline`, so `font-sans` = Geist.
- **Action required:** `pnpm add geist` — or the build breaks on a clean
  install.

## 5. next-themes

- **Code:** `components/theme-provider.tsx` wraps `next-themes`'
  `ThemeProvider`. **It is currently unused** — `app/layout.tsx` does not
  render it. The globe page forces dark styling via hardcoded `dark`
  classes and a `#1a1a1a` background.
- **To enable real theme switching:** `pnpm add next-themes`, wrap
  `{children}` in `<ThemeProvider>` inside `app/layout.tsx`, and add a
  toggle UI.
- **Or:** delete `components/theme-provider.tsx` to remove dead code.

## 6. Vercel (hosting)

- Pushes to `main` trigger automatic Vercel builds and deployments
  (connected through the v0 project).
- `next.config.mjs` sets `images.unoptimized: true`, which also makes the
  app portable to static hosts (Cloudflare Pages, Netlify, GitHub Pages
  via `output: 'export'`).

## 7. v0.app (source sync)

- This repository was generated by and stays in sync with a v0 project:
  edits made in the v0 chat are auto-pushed here, and Vercel redeploys.
- **Consequence:** hand-edits to files like `README.md` can be overwritten
  by the next v0 sync. Treat v0 as the source of truth for generated
  files, or disconnect the sync if this repo becomes the primary home.

## 8–11. Styling & utility packages

- **Tailwind CSS v4** (`tailwindcss`, `@tailwindcss/postcss`): CSS-first
  config in `app/globals.css`; monochrome OKLCH token system.
- **tw-animate-css** + **tailwindcss-animate**: animation utilities
  (imported in CSS; no animation classes are used in the current UI yet).
- **lucide-react**: icon library declared in `components.json`; no icons
  used in the UI yet.
- **clsx** + **tailwind-merge** (`lib/utils.ts` → `cn()`): standard shadcn
  class-merging helper. **class-variance-authority** is installed for
  future component variants.

## `public/` placeholder assets

`placeholder-logo.png/.svg`, `placeholder-user.jpg`, `placeholder.jpg`,
`placeholder.svg` are **v0 scaffolding leftovers**, unreferenced by any
page. Safe to delete when adding real assets.
