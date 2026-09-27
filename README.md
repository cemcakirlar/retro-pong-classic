# Retro Pong Classic

A browser Pong with a CRT look: you versus the AI, mouse, touch, or arrow keys.

## Play

| Input | Action |
| --- | --- |
| Mouse or touch | Move your paddle |
| `↑` / `↓` | Nudge the paddle while playing |
| `Esc` | Pause and resume |

First to the chosen score wins. On a phone, drag the court to move; buttons stay out of the way.

## Options

Set these on the start screen before a match:

- **Difficulty** — Easy, Medium, or Hard (AI speed and miss margin)
- **Sound** and **effects** — blips, particles, and scanlines
- **Goal mode** — score only through a gap (20%, 33%, 50%, or 75% of the court)
- **Winning score** — 5, 11, 15, 21, or any number from 1 to 99
- **Court size** — Small, Medium, or Large, plus fullscreen

## Run locally

**Requires:** Node.js 20+ and [pnpm](https://pnpm.io) 10.

```bash
pnpm install
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Script | What it does |
| --- | --- |
| `pnpm run dev` | Vite dev server on port 3000 |
| `pnpm test` | Physics, AI, and scoring tests (Vitest) |
| `pnpm run lint` | Typecheck with `tsc --noEmit` |
| `pnpm run build` | Production build into `dist/` |
| `pnpm run preview` | Build, then serve with Wrangler |
| `pnpm run deploy` | Build and deploy the Cloudflare Worker |

## Stack

React 19, Vite, Tailwind CSS 4, and Cloudflare Workers (static assets).

## License

[MIT](LICENSE) © 2026 Cem Çakırlar
