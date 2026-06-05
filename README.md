# StockHub v0.2

Production rewrite of U&M Designs StockHub — web + iOS + Android from one
React/TypeScript codebase, wrapped with Capacitor, backed by Supabase.

> **For Claude Code**: read `CLAUDE.md` first, then `BUILD.md` for current status.

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase URL + anon key
# Get these from https://supabase.com/dashboard → your project → Settings → API

# 3. Set up the database
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push

# 4. Start the dev server
npm run dev
# Opens at http://localhost:5173
```

## Build for production (web)

```bash
npm run build
# Output in dist/. Drag to Netlify or push to main if CI is set up.
```

## Build for iOS

Requires macOS + Xcode 15+.

```bash
npm run build
npx cap sync ios
npx cap open ios
# In Xcode: select your team, Archive, distribute via TestFlight
```

## Build for Android

Requires Android Studio + JDK 17.

```bash
npm run build
npx cap sync android
npx cap open android
# In Android Studio: Build → Generate Signed Bundle
```

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright e2e tests |
| `npm run typecheck` | TypeScript check, no emit |

## Project structure

See `CLAUDE.md` section 3 for the full tree.

## Migration from v0.1

The v0.1 HTML lives in `legacy/UM_Designs_StockHub.html`. Treat it as the
executable spec — every behavior in v0.2 must match v0.1 unless explicitly
changed. Per-screen migration guides are in `docs/migration/`.

## Tech stack

React 18 · TypeScript · Vite · Tailwind · Zustand · TanStack Query · Supabase ·
Capacitor 6 · @capacitor-mlkit/barcode-scanning · Recharts · JsBarcode · jsPDF

See `CLAUDE.md` section 2 for the full table + rationale.

## License

Proprietary — DBBS Group / U&M Designs Pvt Ltd.
