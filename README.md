# 2026 Golf Trip

A mobile-first, offline-friendly web app for a 4-day, 4-player golf trip that
tracks a **Quota** game with **quota-point skins**. No backend, no login —
everything is saved in the browser via `localStorage`, so it keeps working with
no signal on the course.

Built with **Vite + React + TypeScript**. Deployable as a static site
(Vercel-friendly).

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build to dist/
npm run preview  # preview the production build
npm test         # scoring-logic sanity checks
```

## Scoring rules

**Quota (individual)**
- `Quota = 36 − handicap`
- Strokes received on a hole (by stroke index):
  `floor(handicap / 18) + (1 if stroke_index <= (handicap mod 18) else 0)`
- `Net = gross − strokes_received`
- Quota points from **net** score vs par:
  net eagle+ = 4, net birdie = 3, net par = 2, net bogey = 1,
  net double+ = 0 (never negative)
- Round result = sum of quota points vs the player's quota.

**Team match (2 v 2, pairs rotate each round)**
- Pair combined quota = sum of both quotas; pair combined points = sum of both
  players' points; margin = points − quota. Higher margin wins the round.
- Default rotation for players A, B, C, D:
  - Round 1 (Thu): A+B vs C+D
  - Round 2 (Fri): A+C vs B+D
  - Round 3 (Sat): A+D vs B+C
  - Round 4 (Sun): A+B vs C+D (configurable — any round's split can be changed)

**Quota-point skins ($1/hole)**
- Each hole, compare all 4 players' **quota points** (not net/gross). Outright
  highest wins the pot. A tie for the lead is a push: the pot carries and
  accumulates $1/hole. Winnings are tracked per round and across the whole trip.

Handicaps may be decimal; strokes and quota are computed from the raw value with
no rounding.

## Screens

Welcome (logo + course picker) → Round home → Live hole entry →
Live leaderboard → Round summary → Trip leaderboard. Players & handicaps are
edited from the **Players** link on the welcome page.

Golfers default to **Brandon, Chase, Vance, Nate** (edit anytime under
Players). Teams rotate every round and any round's 2v2 split is configurable.

## Logo

The welcome page loads `public/logo.png`. Until that file exists it shows a
themed fallback badge, so nothing breaks. To use the real logo, drop your image
in as `public/logo.png` (the "Sweaty Balls Cup" art works great) and commit it.

## Course photos

Drop photos into `public/courses/`. Black Desert is wired to
`/courses/black-desert.jpg`; a missing photo degrades gracefully to a plain
colored panel. Add more by editing `COURSE_PHOTOS` in `src/data/courses.ts`.

## Deploy

`vercel.json` rewrites all routes to `index.html` so client-side routing works
on a static host. Point any static host / Vercel at the repo and build with
`npm run build` (output in `dist/`).

## Install on a phone (PWA)

The app is a Progressive Web App: once deployed over HTTPS it can be installed
to the home screen and runs offline (a service worker precaches the app shell).

1. Deploy the repo to Vercel (auto-detects Vite; no config needed). You get a
   URL like `https://2026-golf-trip.vercel.app`.
2. Open that URL on each player's phone:
   - **iPhone (Safari):** Share → *Add to Home Screen*.
   - **Android (Chrome):** ⋮ menu → *Install app* / *Add to Home Screen*.
3. Launch it from the new icon. After the first load it works with no signal.

**Data is per-device.** There's no backend, so scores live in each phone's
`localStorage` and don't sync between phones. The usual setup is one scorekeeper
entering all four players' scores; everyone else can install it to view the
rules/standings on their own copy.
