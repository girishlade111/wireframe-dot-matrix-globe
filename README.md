# 🌐 Wireframe Dot-Matrix Globe

An interactive 3D wireframe Earth rendered as a **halftone dot-matrix** on
HTML canvas — drag to rotate, scroll to zoom, watch it spin. Built with
Next.js 15, React 19, D3.js geo projections, and Tailwind CSS v4.

![Next.js](https://img.shields.io/badge/Next.js-15.2-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![D3.js](https://img.shields.io/badge/D3.js-geo-F9A03F?logo=d3.js)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38BDF8?logo=tailwindcss)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel)

> **Live demo:** deployed on Vercel via the linked v0 project.
> *(Add the production URL here once confirmed.)*

---

## ✨ Features

- **Dot-matrix Earth** — ~10k halftone dots sampled inside real
  continent polygons (Natural Earth 110m dataset), projected with
  `d3.geoOrthographic` ("view from space").
- **Auto-rotation** — smooth continuous spin via `d3.timer`.
- **Drag to rotate** — click-drag spins the globe manually (latitude
  clamped ±90°); auto-rotate resumes on release.
- **Scroll to zoom** — 0.5×–3× zoom range.
- **Retina-crisp canvas** — full `devicePixelRatio` scaling.
- **Wireframe details** — graticule grid + continent outlines over a pure
  black ocean disc.
- **Monochrome design system** — black/white/gray OKLCH tokens, dark-first
  aesthetic, Geist typeface.
- **Zero backend, zero env vars** — fully client-rendered; map data is
  fetched at runtime from a public GeoJSON CDN.

---

## 🛠️ Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.2 (App Router) |
| UI | React 19, Tailwind CSS v4 (CSS-first config) |
| Visualization | D3.js (`d3.geoOrthographic`, `d3.geoPath`, `d3.geoGraticule`, `d3.timer`) |
| Map data | Natural Earth 1:110m land GeoJSON (runtime fetch) |
| Fonts | Geist Sans + Geist Mono |
| Analytics | Vercel Web Analytics |
| Theming | shadcn/ui tokens + `next-themes` (wired, not yet mounted) |
| Icons | lucide-react |
| Language | TypeScript (strict) |
| Package manager | pnpm |
| Hosting | Vercel (auto-deploy from `main`) |
| Origin | Generated with [v0.app](https://v0.app), synced to this repo |

---

## 🚀 Quickstart

**Prerequisites:** Node.js ≥ 18.18 (20 LTS recommended), pnpm ≥ 8.

```bash
# 1. Clone
git clone https://github.com/girishlade111/wireframe-dot-matrix-globe.git
cd wireframe-dot-matrix-globe

# 2. Install
pnpm install

# 3. Fix known missing dependencies (see docs/THIRD_PARTY_INTEGRATIONS.md)
pnpm add geist @vercel/analytics next-themes
pnpm add d3@7   # pins d3 off "latest"

# 4. Run
pnpm dev        # → http://localhost:3000

# 5. Production build
pnpm build && pnpm start
```

---

## 📁 Project structure

```
wireframe-dot-matrix-globe/
├── app/
│   ├── layout.tsx        # Root layout: fonts, theme CSS, <Analytics/>
│   ├── page.tsx          # Home route → <RotatingEarth width={700} height={500}/>
│   └── globals.css       # ★ Active stylesheet: Tailwind v4 + OKLCH monochrome theme
├── components/
│   ├── rotating-earth.tsx # ★ The globe: canvas + D3 projection + interactions
│   └── theme-provider.tsx # next-themes wrapper (currently unused)
├── lib/
│   └── utils.ts          # cn() class-merge helper
├── styles/
│   └── globals.css       # Dead file — not imported (safe to delete)
├── public/               # Placeholder images (v0 leftovers, unreferenced)
├── docs/
│   ├── ENVIRONMENT_AND_CONFIGURATION.md  # .env guide + every config file explained
│   ├── THIRD_PARTY_INTEGRATIONS.md       # All external deps, datasets & services
│   └── DEVELOPER_GUIDE.md                # Setup, architecture, recipes, troubleshooting
├── next.config.mjs       # Build config (see docs)
├── tsconfig.json         # Strict TS, @/* path alias
├── postcss.config.mjs    # Tailwind v4 PostCSS plugin
├── components.json       # shadcn/ui CLI config
└── package.json          # Scripts: dev / build / start / lint
```

---

## ⚙️ Configuration

No environment variables are required — the app runs with zero config.
For the full reference (`.env` conventions, `.env.example` template,
and every config file explained key-by-key):

📄 **[docs/ENVIRONMENT_AND_CONFIGURATION.md](docs/ENVIRONMENT_AND_CONFIGURATION.md)**

---

## 🔌 Third-party integrations

D3.js · Natural Earth GeoJSON (runtime fetch) · Vercel Analytics ·
Vercel hosting · v0.app sync · Geist fonts · Tailwind v4 · lucide-react.

📄 **[docs/THIRD_PARTY_INTEGRATIONS.md](docs/THIRD_PARTY_INTEGRATIONS.md)**

> ⚠️ Heads-up: `geist`, `@vercel/analytics`, and `next-themes` are
> imported in code but missing from `package.json` — install them (or
> remove the imports) before a clean build. Details in the doc above.

---

## 🧑‍💻 Developer guide

Architecture walkthrough, rendering-pipeline deep dive, customization
recipes (dot density, colors, spin speed, map resolution), performance
notes, known issues, deployment, and troubleshooting:

📄 **[docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)**

---

## 🎨 Customization (quick recipes)

| Want | Do |
|---|---|
| Denser dots | Lower `16` in `generateDotsInPolygon(feature, 16)` |
| Faster spin | Raise `rotationSpeed = 0.5` |
| New colors | Edit `fillStyle`/`strokeStyle` in `render()` |
| Sharper coastlines | Swap `110m` → `50m`/`10m` in the fetch URL |
| Bigger globe | Change props in `app/page.tsx` (`width`/`height`) |

Full table in the Developer Guide.

---

## 🔒 Security notes

- **Next.js 15.2.4 is affected by React2Shell (CVE-2025-55182, CVSS 10.0
  RCE)** plus CVE-2025-66478 / CVE-2025-55184 / CVE-2025-67779. Bump to
  **≥ 15.2.8** (`pnpm add next@15.2.8`) before any production deploy.
- `next.config.mjs` currently sets `eslint.ignoreDuringBuilds` and
  `typescript.ignoreBuildErrors` — remove these once lint/type errors are
  fixed so broken code can't ship silently.
- No secrets or env vars exist in this app; `.gitignore` excludes `.env*`.

---

## 🗺️ Roadmap ideas

- [ ] Self-host the GeoJSON in `public/data/` (offline support)
- [ ] `NEXT_PUBLIC_LAND_DATA_URL` override for the dataset
- [ ] Mount `ThemeProvider` + add a light/dark toggle
- [ ] Country hover tooltips / click-to-focus
- [ ] Day/night terminator shading
- [ ] Remove dead files (`styles/globals.css`, placeholders)
- [ ] Add ESLint properly (`next lint` is deprecated in Next 15)

---

## 🤝 Contributing

1. Branch from `main`, keep the monochrome design language.
2. `pnpm build` must pass clean.
3. Open a PR — Vercel posts a preview deployment.

> Note: this repo auto-syncs from v0.app — direct pushes may be
> overwritten by the next v0 sync.

---

## 👤 Credits

Built with ❤️ by **Girish Lade** · [ladestack.in](https://ladestack.in)

Map data: [Natural Earth](https://www.naturalearthdata.com/) (public domain).
Originally generated with [v0.app](https://v0.app) by Vercel.
