# SaaS Admin (Vite + React + Hono)

This repository is a Vite + React 19 single-page app. Screens are rendered in the browser with React Router. `/api/*` is a Hono app on Cloudflare Workers, served on the same origin by `@cloudflare/vite-plugin` and Wrangler static assets.

There is no Next.js and no server rendering. Do not add `next`, an `app/` directory, or SSR.

## Commands

- `npm run dev` — Vite on port 3000. The SPA and `/api/*` share one origin.
- `npm run build` — client bundle plus the Worker.
- `npm run preview` — the production build in the Workers runtime.
- `npm run deploy` — build, then `wrangler deploy`.

## Behavior to keep

- Adds, updates, and deletes stay in the browser module store (`hooks/useUserStore.ts`). A reload restores the 100 seeded users (`data/users.ts`, seed 42). Do not persist that state on the Worker or in a database.
- `GET /api/users` pages the seed only. Query params are `page` and `limit`. It does not see in-memory adds, updates, deletes, or the email filter.
- `GET /api/health` returns `{ "ok": true }`.
- `/users/new` keeps the WebMCP attributes `toolname="register_user"`, `tooldescription`, and `toolparamdescription` on the same elements.
- `/users/:id` edits and deletes that same in-memory user. Its form keeps the WebMCP attributes with `toolname="update_user"`. Missing or deleted ids show `ユーザーが見つかりません`.
- UI copy is Japanese. The document title is `SaaS Admin - 管理画面` and `html` is `lang="ja"`.

## Security

See `.cursor/rules/security.mdc`. No real personal data, no server-side database, and a minimal dependency set. `npm audit` must stay at 0 vulnerabilities.
