# Environment & Configuration

Complete reference for every environment variable and configuration file in
**wireframe-dot-matrix-globe**. Nothing is assumed — everything below was
verified against the repository at the time of writing.

---

## 1. Environment variables (`.env`)

### Current state: the app uses ZERO environment variables

Verified by grepping the entire codebase (`app/`, `components/`, `lib/`,
`*.mjs`) for `process.env` — there are **no matches**. The app runs with no
secrets, no API keys, and no build-time configuration injected from the
environment.

- `.env`, `.env.local`, `.env.development`, `.env.production` do not exist
  in the repo (and should not be committed if created).
- `.gitignore` already excludes `.env*`, so any local env file you create
  stays private by default.

### Next.js env-file conventions (for future use)

If you later add an API key, a data-source override, or analytics IDs,
follow these rules:

| File | Loaded when | Committed? |
|---|---|---|
| `.env` | Always | ❌ No |
| `.env.local` | Always (overrides `.env`) | ❌ No |
| `.env.development` | `pnpm dev` | ⚠️ Only if it holds no secrets |
| `.env.production` | `pnpm build` / `pnpm start` | ⚠️ Only if it holds no secrets |
| `.env.example` | Never (template only) | ✅ Yes |

Precedence (highest → lowest): `process.env` → `.env.$(NODE_ENV).local` →
`.env.local` → `.env.$(NODE_ENV)` → `.env`.

**`NEXT_PUBLIC_` prefix rule:** variables are server-only unless prefixed
with `NEXT_PUBLIC_`. Only `NEXT_PUBLIC_*` variables are inlined into the
client bundle. Never put a secret in a `NEXT_PUBLIC_` variable.

### Recommended `.env.example` template

Copy this to `.env.example` at the repo root and commit it. Copy to
`.env.local` and fill values for local development. Everything here is
**optional** — the app works without any of it.

```bash
# ── Site ──────────────────────────────────────────────────────────────
# Public base URL of the deployed site (used for metadata/OG tags if added).
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ── Data source ───────────────────────────────────────────────────────
# Override the Natural Earth GeoJSON URL fetched at runtime by
# components/rotating-earth.tsx. Useful for self-hosting the dataset
# (see docs/THIRD_PARTY_INTEGRATIONS.md) or switching resolution.
# Default: https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json
NEXT_PUBLIC_LAND_DATA_URL=

# ── Analytics ─────────────────────────────────────────────────────────
# Vercel Web Analytics needs no env var (works automatically on Vercel).
# If you add a third-party analytics provider, put its public ID here.
NEXT_PUBLIC_ANALYTICS_ID=
```

> To actually honor `NEXT_PUBLIC_LAND_DATA_URL`, replace the hardcoded
> `fetch(...)` URL in `components/rotating-earth.tsx` with
> `process.env.NEXT_PUBLIC_LAND_DATA_URL || "<default url>"`.

### Setting env vars on Vercel

1. Vercel dashboard → project → **Settings → Environment Variables**.
2. Add each variable, select the environments
   (Development / Preview / Production).
3. Redeploy — env vars are baked in at build time for `NEXT_PUBLIC_*`.

---

## 2. Configuration files

### `next.config.mjs` — Next.js build/runtime config

```js
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,   // skip ESLint during `next build`
  },
  typescript: {
    ignoreBuildErrors: true,    // skip `tsc` type-check during `next build`
  },
  images: {
    unoptimized: true,          // disable Next.js image optimization
  },
}
```

| Key | What it does | Why it is set |
|---|---|---|
| `eslint.ignoreDuringBuilds` | `next build` skips ESLint | v0 default — deploys never fail on lint |
| `typescript.ignoreBuildErrors` | `next build` skips type errors | v0 default — deploys never fail on TS errors |
| `images.unoptimized` | Serves `<Image>` as-is | Required for **static export** and non-Vercel hosts (no Image Optimization server) |

> ⚠️ The first two are **technical debt, not features**. They let broken
> code ship silently. For a production-grade repo, remove both and fix the
> underlying lint/type errors instead.

### `tsconfig.json` — TypeScript config

Key settings:

| Setting | Value | Effect |
|---|---|---|
| `strict` | `true` | Full strict type-checking |
| `jsx` | `preserve` | Next.js handles JSX transform |
| `moduleResolution` | `bundler` | Modern bundler-style resolution |
| `paths["@/*"]` | `["./*"]` | `@/components/...` → repo-root-relative imports |
| `noEmit` | `true` | Type-check only; Next emits the JS |
| `target` | `ES6` | Downlevel output target |
| `plugins: [{name: "next"}]` | — | Next.js TS plugin for editor support |

### `postcss.config.mjs` — CSS pipeline

```js
plugins: { '@tailwindcss/postcss': {} }
```

Single plugin: the **Tailwind CSS v4** PostCSS plugin. There is no
`tailwind.config.js` — Tailwind v4 is configured **CSS-first** via
`@import "tailwindcss"` and `@theme` blocks in `app/globals.css`.

### `components.json` — shadcn/ui config

```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": { "css": "app/globals.css", "baseColor": "neutral", "cssVariables": true },
  "aliases": { "components": "@/components", "utils": "@/lib/utils", ... },
  "iconLibrary": "lucide"
}
```

This is the shadcn CLI config (style preset, CSS entry, path aliases,
icon library). Currently only `lib/utils.ts` (`cn()`) exists from the
shadcn world — no `components/ui/*` primitives are installed.

### `app/globals.css` — Tailwind v4 theme (the active one)

This is the stylesheet imported by `app/layout.tsx` and therefore the
**only one that takes effect**. It:

- Imports `tailwindcss` and `tw-animate-css`.
- Declares a **monochromatic OKLCH design system** (`:root` light tokens +
  `.dark` overrides) — black/white/gray only, no hue.
- Maps tokens into Tailwind v4 via `@theme inline`
  (`--color-background`, `--radius-*`, `--color-sidebar-*`, …).
- Enables class-based dark mode with `@custom-variant dark (&:is(.dark *))`.
- Applies base styles: `*` gets `border-border`, `body` gets
  `bg-background text-foreground`.

To retheme the app, edit the OKLCH values in this file — no Tailwind
config file needed.

### `styles/globals.css` — DEAD FILE (do not edit)

A leftover default shadcn stylesheet with a *different* (colorful) token
set. It is **not imported anywhere** — `app/layout.tsx` imports
`./globals.css` (the `app/` one). Editing `styles/globals.css` changes
nothing. Safe to delete.

### `package.json` — scripts & engines

```json
"scripts": {
  "build": "next build",
  "dev":   "next dev",
  "lint":  "next lint",
  "start":  "next start"
}
```

- `pnpm dev` → dev server at `http://localhost:3000` (hot reload).
- `pnpm build` → production build into `.next/`.
- `pnpm start` → serves the production build (run after `pnpm build`).
- `pnpm lint` → `next lint` is **deprecated/removed in newer Next.js**;
  migrate to `eslint` directly (see Developer Guide).

No `engines` field is declared — any Node ≥ 18.18 works, Node 20 LTS
recommended. `pnpm-lock.yaml` pins every transitive dependency
reproducibly.

### `.gitignore`

Ignores: `node_modules/`, `.next/`, `/out/`, `/build`, debug logs,
**`.env*`**, `.vercel`, `*.tsbuildinfo`, `next-env.d.ts`.

---

## 3. Runtime configuration inside the app

These are not config files, but hardcoded values in
`components/rotating-earth.tsx` that behave like configuration:

| Constant | Value | Effect |
|---|---|---|
| Default `width` / `height` props | `800` / `600` (page uses `700` / `500`) | Canvas target size |
| Viewport clamping | `window.innerWidth - 40`, `window.innerHeight - 100` | Responsive fit |
| Globe radius | `min(w, h) / 2.5` | Globe size |
| `dotSpacing` | `16` → grid step `1.28°` | Dot density (smaller = denser) |
| `rotationSpeed` | `0.5` deg/frame | Auto-rotation speed |
| Drag sensitivity | `0.5` | Pixels → degrees |
| Zoom range | `0.5×` – `3×` of base radius | Wheel zoom limits |
| Dot radius | `1.2 × scaleFactor` | Halftone dot size |
| Dot color | `#999999`, ocean `#000000`, lines `#ffffff` | Monochrome palette |
| Data URL | `raw.githubusercontent.com/…/110m/…/ne_110m_land.json` | Land dataset |

See `docs/DEVELOPER_GUIDE.md` → *Customization recipes* for how to change
each of these.
