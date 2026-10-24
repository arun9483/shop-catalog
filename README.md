# shop-catalog

The Catalog micro frontend of the shop platform: the product list and product detail pages. The
[Shell](https://github.com/arun9483/shop-shell) loads it on `/catalog`. Requirements and decisions are
in [arun-mfe-platform](https://github.com/arun9483/arun-mfe-platform)
([vision](https://github.com/arun9483/arun-mfe-platform/blob/main/docs/vision.md),
[MVP](https://github.com/arun9483/arun-mfe-platform/blob/main/docs/mvp.md)).

| Folder           | What                                                                     | Port   |
| ---------------- | ------------------------------------------------------------------------ | ------ |
| `client/`        | React + single-spa-react MFE, built with Vite, served at `/mfe/catalog/` | —      |
| `fes/`           | Express FES: serves the client, `/api/catalog/*`, health and version     | `3002` |
| `mock-backend/`  | Dev only. Stand-in for the Catalog backend service                       | `4002` |
| `server-common/` | Trace context, problem+json, health and version for the servers          | —      |

## How it loads

The Shell imports `/mfe/catalog/entry.js` on the first visit to `/catalog`. That file is a one-line
re-export of the hashed entry, which holds only the single-spa lifecycles and the route table. The
product list, product detail and test-error pages are lazy chunks; React is a chunk of its own.

| Route                 | Page                                   |
| --------------------- | -------------------------------------- |
| `/catalog`            | Product list                           |
| `/catalog/:id`        | Product detail                         |
| `/catalog/test-error` | Test errors (`?kind=` as in the Shell) |

## Run

Node 24.22.1 or newer and pnpm 11 (`corepack enable`). Copy each `.env.example` to `.env`; the New
Relic values in it are placeholders.

```sh
pnpm install
pnpm build
pnpm start          # FES and mock backend
```

Then run the Shell and open http://localhost:3000/catalog. The Shell's router sends `/mfe/catalog/*`
and `/api/catalog/*` here.

Catalog errors are reported by the Shell's browser agent, so `NEW_RELIC_BROWSER_APP_ID` in
`client/.env` is the Shell's browser application ID; the source maps are uploaded there.

## Check

```sh
pnpm lint && pnpm typecheck && pnpm test
```
