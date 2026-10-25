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

## Standalone

Run Catalog without the Shell, on the Shell stub
[`@arun-shop/shell-stub`](https://www.npmjs.com/package/@arun-shop/shell-stub):

```sh
pnpm start          # FES and mock backend
pnpm standalone     # the stub on :3102
```

Then open http://localhost:3102/catalog. The stub loads what the Shell loads (design-system CSS, the Inter
font, the Shell's base styles and single-spa) and proxies `/mfe/catalog` and `/api/catalog` to this FES on
`3002`. The code is the same in both modes; only the page around it differs. Add
`--env-file <file>` with the Shell's New Relic browser keys to report errors (see the stub's README).

### With HMR

```sh
pnpm start            # FES and mock backend
pnpm standalone:dev   # the stub on :3102, running this repo's Vite: edits show without a reload
```

One process: the stub runs `client/`'s own Vite with its `vite.config.ts`, so HMR and React Fast
Refresh work on the stub's port. The API still goes to the FES. If port 3102 is taken, pass
`--port <n>`, set `SHELL_STUB_PORT`, or use `--port 0` for any free port.

## Deploy

`.github/workflows/deploy-staging.yml` deploys Catalog to staging on Cloud Run: on every push to `main`
after lint, typecheck and tests pass, or by hand from any branch (**Actions → Deploy to staging → Run
workflow**). It builds the client for staging (uploading its source maps), builds one image for the mock
backend and one for the FES (`deploy/Dockerfile`), deploys the backend as a private service that only
this FES may call, then the FES, and checks the FES is ready. The Shell's Worker is the public entry.

The workflow reads every identifier from GitHub: repository variables `GCP_PROJECT_ID`, `GCP_REGION`,
`GCP_WIF_PROVIDER`, `GCP_DEPLOYER`; `staging` environment variables `PUBLIC_ORIGIN`,
`NEW_RELIC_BROWSER_APP_ID`; and the secret `NEW_RELIC_USER_API_KEY`. No Google key is stored: GitHub
Actions signs in with workload identity federation.

## Check

```sh
pnpm lint && pnpm typecheck && pnpm test
```
