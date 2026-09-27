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
pnpm lint      # eslint (flat config, next/core-web-vitals + next/typescript)
```

> ✅ **Audit status (Sep 2026):** all dependency drift fixed — `geist`,
> `@vercel/analytics`, and `@tailwindcss/postcss` added to
> `package.json`; `d3` pinned to `^7.9.0`; `next-themes` removed with
> the dead `theme-provider.tsx`. `pnpm build` passes clean on a fresh
> clone. (pnpm ≥ 12 asks once to approve the `sharp` build script —
> already recorded in `pnpm-workspace.yaml`.)

---

## 3. Architecture overview

```
app/
  layout.tsx        Root layout: Geist fonts, globals.css, <Analytics/>
  page.tsx          Home route: <main> → <RotatingEarth width={700} height={500}/>
  globals.css       Tailwind v4 + monochrome OKLCH theme (the ACTIVE stylesheet)
components/
  rotating-earth.tsx  ★ The app. Client component: canvas + D3 globe
lib/
  utils.ts          cn() class-merging helper (shadcn standard)
public/             (empty — v0 placeholder images removed in audit)
eslint.config.mjs   Flat config: next/core-web-vitals + next/typescript
pnpm-workspace.yaml pnpm ≥ 12 build-script approval (sharp)
```

**Data flow (single page, no backend):**

1. `page.tsx` (server component) renders `<RotatingEarth/>`.
2. `rotating-earth.tsx` (`"use client"`) mounts a `<canvas>`, sizes it for
   DPR, and creates a `d3.geoOrthographic` projection.
3. On mount it `fetch()`es the Natural Earth 110m land GeoJSON from
   `raw.githubusercontent.com` (shows a loading indicator, then an error
   card if the fetch fails).
4. For every land feature it samples a lat/long grid inside the feature's
   bounding box, keeps points inside the polygon (ray-casting
   point-in-polygon, holes respected), and stores them as dots.
5. `d3.timer` rotates the projection `0.5°/frame` and re-renders:
   ocean disc → graticule → land outlines → halftone dots (far-side dots
   culled via `d3.geoDistance` > 90° test).
6. `pointerdown` + drag rotates manually (auto-rotate pauses while
   dragging, pointer capture keeps events flowing); `wheel` zooms
   `0.5×–3×`. Touch works via the same pointer events.

---

## 4. Rendering pipeline (deep dive)

| Stage | Code location | How it works |
|---|---|---|
| Projection | `d3.geoOrthographic().scale(radius).translate([w/2,h/2]).clipAngle(90)` | Orthographic = "view from space"; `clipAngle(90)` clips *paths* (land outlines, graticule) to the front hemisphere |
| Far-side culling | `d3.geoDistance([dot.lng, dot.lat], visibleCenter) > Math.PI/2` → skip | `projection()` does **not** apply `clipAngle` (verified empirically) — without this test, back-hemisphere dots draw mirrored onto the front disc |
| Dot sampling | `generateDotsInPolygon(feature, 16)` | Grid over `d3.geoBounds(feature)` with step `16 × 0.08 = 1.28°`; `pointInFeature` keeps interior points, rejects holes; supports `Polygon` + `MultiPolygon` |
| Frame render | `render()` | `clearRect` → ocean circle → graticule (`geoGraticule`, alpha 0.25) → land outlines → dots projected via `projection([lng,lat])`, drawn only if inside canvas bounds |
| DPR handling | `canvas.width = cssW × devicePixelRatio; ctx.scale(dpr, dpr)` | Crisp rendering on retina displays |
| Rotation | `d3.timer(rotate)` | Mutates `rotation[0]`, calls `projection.rotate()` + `render()` every frame |
| Interaction | `pointerdown/move/up` + `setPointerCapture`, `wheel` (non-passive) | Unified mouse/touch/pen drag; `touch-action: none` stops gesture hijacking; latitude clamped ±90°; wheel → zoom via `projection.scale()` |

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

**Fixed in the Sep 2026 audit** (verified: `tsc --noEmit`, `eslint`,
`next build` all green + 16/16 Playwright E2E):

1. ✅ Missing deps added — `geist`, `@vercel/analytics`,
   `@tailwindcss/postcss`; `d3` pinned to `^7.9.0` (was `"latest"`).
2. ✅ Dead code deleted — `styles/globals.css`,
   `components/theme-provider.tsx` (+ `next-themes`),
   `public/placeholder.*`.
3. ✅ `next.config.mjs` no longer ignores ESLint/TypeScript errors.
4. ✅ Next.js **15.2.4 → 15.2.8** (CVE-2025-55182 React2Shell RCE,
   CVE-2025-66478, CVE-2025-55184, CVE-2025-67779).
5. ✅ **Far-side dots bug** — back-hemisphere dots were drawn mirrored
   onto the front disc; now culled (`d3.geoDistance` test).
6. ✅ Touch support via pointer events + pointer capture (was
   mouse-only; also fixed a document-listener leak on unmount
   mid-drag).
7. ✅ `isLoading` drives a real loading indicator (was dead state);
   metadata updated from "v0 App" to the real title/description;
   `[v0]` console noise removed; `rotation` tuple typing fixed
   (2 tsc errors).

**Remaining:**

1. **Land dataset is a runtime fetch.** Consider self-hosting
   `ne_110m_land.json` under `public/` so the globe renders offline.
2. **`d3.timer` auto-rotate** re-renders every frame — pause on
   `document.visibilitychange` to save battery.
3. **Keyboard accessibility** — canvas has `role="img"` + `aria-label`,
   but keyboard users can't rotate it yet (`tabIndex` + arrow keys).
4. **Hardcoded data URL** — move to `NEXT_PUBLIC_LAND_DATA_URL` for
   flexibility (see Environment doc).
5. No CI — consider a build + lint check on PRs.

---

## 8. Linting

ESLint is configured (flat config, `eslint.config.mjs`):
`next/core-web-vitals` + `next/typescript`, via `FlatCompat`.
Run `pnpm lint` (= `eslint .`). Note: ESLint 9 is used —
`eslint-config-next@15` is incompatible with ESLint 10.

---

## 9. Deployment

- **Vercel (current):** push to `main` → automatic build & deploy.
  `images.unoptimized: true` is already set, so the app also works on:
- **Cloudflare Pages / Netlify:** either as a Node app or static export
  (add `output: 'export'` to `next.config.mjs` — the app is fully
  client-rendered, so static export works; the GeoJSON fetch happens in
  the browser).
- **Security checklist before deploy:** ✅ done in audit — `next`
  bumped to 15.2.8, missing deps fixed, `eslint`/`tsc` ignores removed,
  `[v0]` console noise removed (§7).

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Module not found: geist/font/sans` | `geist` not in `package.json` | `pnpm add geist` |
| `Module not found: @vercel/analytics` | not in `package.json` | `pnpm add @vercel/analytics` or remove `<Analytics/>` |
| Globe shows, but no land dots | GeoJSON fetch failed (offline/CORS) | Check network tab; self-host the JSON |
| Blurry globe on retina | DPR code removed/changed | Keep the `devicePixelRatio` scaling block |
| Dots too sparse/dense | `dotSpacing` value | Tune per §5 (quadratic cost!) |
| `pnpm install` fails on build scripts | pnpm ≥ 12 blocks unapproved build scripts | `pnpm approve-builds` (sharp already approved in `pnpm-workspace.yaml`) |

---

## 11. Contributing

1. Create a feature branch from `main`.
2. Keep the monochrome design language (OKLCH tokens in `app/globals.css`).
3. Run `pnpm build`, `pnpm lint`, and `pnpm exec tsc --noEmit` clean
   (no ignored errors).
4. Open a PR; Vercel posts a preview deployment automatically.

> Note: this repo auto-syncs from v0.app — direct pushes may be
> overwritten by the next v0 sync. Coordinate if v0 is still the source
> of truth.
