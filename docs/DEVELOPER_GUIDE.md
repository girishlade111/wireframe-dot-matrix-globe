# Developer Guide

How to run, understand, modify, and ship **wireframe-dot-matrix-globe**.

---

## 1. Prerequisites

- **Node.js** ≥ 18.18 (20 LTS recommended)
- **pnpm** ≥ 8 — `npm i -g pnpm` if missing
- A modern browser (the globe is a `<canvas>` 2D app; no WebGL needed)

---

## 2. Setup & commands

```bash
pnpm install   # install dependencies (reads pnpm-lock.yaml)
pnpm dev       # dev server → http://localhost:3000
pnpm build     # production build → .next/
pnpm start     # serve the production build (after pnpm build)
pnpm lint      # ⚠️ `next lint` is deprecated in Next 15 — see §8
```

> ⚠️ **Before your first build**, read
> `docs/THIRD_PARTY_INTEGRATIONS.md` → *missing-dependency warning*.
> `geist`, `@vercel/analytics`, and `next-themes` are imported but not in
> `package.json`. Run:
> ```bash
> pnpm add geist @vercel/analytics next-themes
> pnpm add -D d3@7   # also pins d3 off "latest"
> ```
> …or remove the corresponding imports if you don't need them.

---

## 3. Architecture overview

```
app/
  layout.tsx        Root layout: Geist fonts, globals.css, <Analytics/>
  page.tsx          Home route: <main> → <RotatingEarth width={700} height={500}/>
  globals.css       Tailwind v4 + monochrome OKLCH theme (the ACTIVE stylesheet)
components/
  rotating-earth.tsx  ★ The app. Client component: canvas + D3 globe
  theme-provider.tsx  next-themes wrapper — currently UNUSED (dead code)
lib/
  utils.ts          cn() class-merging helper (shadcn standard)
styles/
  globals.css       DEAD FILE — not imported anywhere (safe to delete)
public/             placeholder images (v0 leftovers, unreferenced)
```

**Data flow (single page, no backend):**

1. `page.tsx` (server component) renders `<RotatingEarth/>`.
2. `rotating-earth.tsx` (`"use client"`) mounts a `<canvas>`, sizes it for
   DPR, and creates a `d3.geoOrthographic` projection.
3. On mount it `fetch()`es the Natural Earth 110m land GeoJSON from
   `raw.githubusercontent.com`.
4. For every land feature it samples a lat/long grid inside the feature's
   bounding box, keeps points inside the polygon (ray-casting
   point-in-polygon, holes respected), and stores them as dots.
5. `d3.timer` rotates the projection `0.5°/frame` and re-renders:
   ocean disc → graticule → land outlines → halftone dots.
6. `mousedown` + drag rotates manually (auto-rotate pauses while dragging);
   `wheel` zooms `0.5×–3×`.

---

## 4. Rendering pipeline (deep dive)

| Stage | Code location | How it works |
|---|---|---|
| Projection | `d3.geoOrthographic().scale(radius).translate([w/2,h/2]).clipAngle(90)` | Orthographic = "view from space"; `clipAngle(90)` hides the far hemisphere |
| Dot sampling | `generateDotsInPolygon(feature, 16)` | Grid over `d3.geoBounds(feature)` with step `16 × 0.08 = 1.28°`; `pointInFeature` keeps interior points, rejects holes; supports `Polygon` + `MultiPolygon` |
| Frame render | `render()` | `clearRect` → ocean circle → graticule (`geoGraticule`, alpha 0.25) → land outlines → dots projected via `projection([lng,lat])`, drawn only if inside canvas bounds |
| DPR handling | `canvas.width = cssW × devicePixelRatio; ctx.scale(dpr, dpr)` | Crisp rendering on retina displays |
| Rotation | `d3.timer(rotate)` | Mutates `rotation[0]`, calls `projection.rotate()` + `render()` every frame |
| Interaction | `mousedown/mousemove/mouseup`, `wheel` | Drag → manual rotation (latitude clamped ±90°); wheel → zoom via `projection.scale()` |

**Dot-count math:** at 110m resolution with `dotSpacing = 16` the app
generates on the order of ~10k dots. Halving `dotSpacing` roughly
**quadruples** the dot count (2D grid) — generation happens once at load,
but every frame re-projects all dots, so density directly affects FPS.

---

## 5. Customization recipes

All in `components/rotating-earth.tsx` unless noted.

| Goal | Change |
|---|---|
| Denser / sparser dots | `generateDotsInPolygon(feature, 16)` — lower number = denser |
| Faster / slower spin | `rotationSpeed = 0.5` (degrees per frame) |
| Different colors | `fillStyle`/`strokeStyle` in `render()` (`#000000` ocean, `#ffffff` lines, `#999999` dots) |
| Globe size | `radius = Math.min(w,h) / 2.5` and/or the `width`/`height` props in `app/page.tsx` |
| Sharper coastlines | Swap the fetch URL `110m` → `50m` → `10m` (see Integrations doc) |
| Disable auto-rotate | Set `autoRotate = false` initially |
| Change page background | `app/page.tsx` → `bg-[#1a1a1a]` |
| Retheme (light/dark tokens) | `app/globals.css` OKLCH variables |
| Remove the hint pill | Delete the `"Drag to rotate • Scroll to zoom"` div |
| Self-host map data | Save JSON to `public/data/`, fetch `/data/ne_110m_land.json` |

---

## 6. Environment-specific behavior

- **No env vars required** — the app runs with zero configuration
  (see `docs/ENVIRONMENT_AND_CONFIGURATION.md`).
- **Offline:** globe renders ocean + graticule; land dots fail with an
  error card ("Failed to load land map data").
- **SSR:** `rotating-earth.tsx` is `"use client"`; all D3/canvas work runs
  in `useEffect`, so there is no server/client mismatch.
- **Console:** the component logs `[v0] Generated N points…` per feature —
  noisy; remove or gate behind `NODE_ENV === "development"` for production.

---

## 7. Known issues & tech debt

1. **Missing dependencies** — `geist`, `@vercel/analytics`, `next-themes`
   imported but not in `package.json` (breaks clean installs). Fix in §2.
2. **`d3: "latest"`** — unpinned; a new major can break the build. Pin to `^7`.
3. **Dead files** — `styles/globals.css` and `components/theme-provider.tsx`
   (unused) + `public/placeholder.*` images. Delete or wire up.
4. **`next.config.mjs`** sets `eslint.ignoreDuringBuilds` and
   `typescript.ignoreBuildErrors` — broken code ships silently. Remove once
   lint/type errors are fixed.
5. **Next.js 15.2.4 security** — affected by React2Shell
   (**CVE-2025-55182**, CVSS 10.0 RCE) and related advisories
   (CVE-2025-66478, CVE-2025-55184, CVE-2025-67779). Minimum safe bump on
   the 15.2 line is **15.2.8** (`pnpm add next@15.2.8`). Do this before any
   production deploy.
6. **Hardcoded data URL** — move to `NEXT_PUBLIC_LAND_DATA_URL` for
   flexibility (see Environment doc).
7. **Error-state styling** uses `dark`/`bg-card` classes but no
   `ThemeProvider` is mounted — the error card may look off in light mode.
8. **No tests, no CI lint** — consider adding at least a build check.

---

## 8. Linting

`pnpm lint` runs `next lint`, which is **deprecated in Next 15** and removed
in Next 16. To lint properly:

```bash
pnpm add -D eslint eslint-config-next   # then: pnpm exec eslint .
```

---

## 9. Deployment

- **Vercel (current):** push to `main` → automatic build & deploy.
  `images.unoptimized: true` is already set, so the app also works on:
- **Cloudflare Pages / Netlify:** either as a Node app or static export
  (add `output: 'export'` to `next.config.mjs` — the app is fully
  client-rendered, so static export works; the GeoJSON fetch happens in
  the browser).
- **Security checklist before deploy:** bump `next` to ≥ 15.2.8 (§7.5),
  fix missing deps (§2), remove `[v0]` console noise (§6).

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Module not found: geist/font/sans` | `geist` not in `package.json` | `pnpm add geist` |
| `Module not found: @vercel/analytics` | not in `package.json` | `pnpm add @vercel/analytics` or remove `<Analytics/>` |
| Globe shows, but no land dots | GeoJSON fetch failed (offline/CORS) | Check network tab; self-host the JSON |
| `next lint` errors / does nothing | deprecated in Next 15 | Use `eslint` directly (§8) |
| Blurry globe on retina | DPR code removed/changed | Keep the `devicePixelRatio` scaling block |
| Dots too sparse/dense | `dotSpacing` value | Tune per §5 (quadratic cost!) |
| Build passes locally, fails on Vercel | v0 env pre-installs missing deps | Fix missing deps (§2) — never rely on the v0 environment |

---

## 11. Contributing

1. Create a feature branch from `main`.
2. Keep the monochrome design language (OKLCH tokens in `app/globals.css`).
3. Run `pnpm build` clean (after fixing §7.4 — no ignored errors).
4. Open a PR; Vercel posts a preview deployment automatically.

> Note: this repo auto-syncs from v0.app — direct pushes may be
> overwritten by the next v0 sync. Coordinate if v0 is still the source
> of truth.
