import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app.js';

const version = { name: 'fes', version: '0.1.0', commit: 'test', buildTime: 'now' };

let backend: Server;
let backendUrl: string;
const clientDist = mkdtempSync(join(tmpdir(), 'catalog-client-'));

beforeAll(async () => {
  writeFileSync(join(clientDist, 'entry.js'), "export * from './assets/entry-abc123.js';");
  mkdirSync(join(clientDist, 'assets'));
  writeFileSync(join(clientDist, 'assets', 'entry-abc123.js'), 'export {};');

  const fake = express();
  fake.get('/products', (_req, res) => {
    res.json([{ id: 'mug' }]);
  });
  fake.get('/products/:id', (req, res) => {
    res.json({ id: req.params.id });
  });
  fake.get('/test-error', (_req, res) => {
    res.status(500).type('application/problem+json').json({ status: 500 });
  });
  fake.get('/health/ready', (_req, res) => {
    res.json({ status: 'pass' });
  });
  backend = fake.listen(0);
  await new Promise((resolve) => backend.once('listening', resolve));
  backendUrl = `http://localhost:${(backend.address() as AddressInfo).port}`;
});

afterAll(() => {
  backend.close();
  rmSync(clientDist, { recursive: true, force: true });
});

const app = () => createApp({ backendUrl, clientDist, version, backendTimeoutMs: 1000 });

describe('catalog FES API', () => {
  it('forwards the product list from its backend', async () => {
    const res = await request(app()).get('/api/catalog/products');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 'mug' }]);
    expect(res.headers.traceresponse).toBeDefined();
  });

  it('forwards one product', async () => {
    const res = await request(app()).get('/api/catalog/products/mug');
    expect(res.body).toEqual({ id: 'mug' });
  });

  it('throws its own test error and forwards the backend one', async () => {
    expect((await request(app()).get('/api/catalog/test-error')).status).toBe(500);
    const backendError = await request(app()).get('/api/catalog/test-error?in=backend');
    expect(backendError.status).toBe(500);
    expect(backendError.headers['content-type']).toMatch(/^application\/problem\+json/);
  });
});

describe('catalog FES static files', () => {
  it('serves entry.js uncached and hashed files as immutable', async () => {
    const entry = await request(app()).get('/mfe/catalog/entry.js');
    expect(entry.status).toBe(200);
    expect(entry.headers['cache-control']).toBe('no-cache');
    const hashed = await request(app()).get('/mfe/catalog/assets/entry-abc123.js');
    expect(hashed.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('serves no page and no source maps', async () => {
    expect((await request(app()).get('/catalog')).status).toBe(404);
    expect((await request(app()).get('/mfe/catalog/assets/entry-abc123.js.map')).status).toBe(404);
  });
});

describe('catalog FES health', () => {
  it('is ready when its backend is ready', async () => {
    expect((await request(app()).get('/health/ready')).status).toBe(200);
  });

  it('is not ready when its backend is down', async () => {
    const down = createApp({
      backendUrl: 'http://localhost:1',
      clientDist,
      version,
      backendTimeoutMs: 1000,
    });
    expect((await request(down).get('/health/ready')).status).toBe(503);
  });
});

describe('catalog FES backend auth', () => {
  it('sends its backend headers on API calls and readiness checks', async () => {
    const seen: (string | undefined)[] = [];
    const privateBackend = express();
    privateBackend.use((req, res) => {
      seen.push(req.get('authorization'));
      res.json({ ok: true });
    });
    const server = privateBackend.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const url = `http://localhost:${(server.address() as AddressInfo).port}`;
    const app = createApp({
      backendUrl: url,
      clientDist,
      version,
      backendTimeoutMs: 1000,
      backendHeaders: () => Promise.resolve({ Authorization: 'Bearer token-123' }),
    });
    await request(app).get('/api/catalog/products');
    await request(app).get('/health/ready');
    expect(seen).toEqual(['Bearer token-123', 'Bearer token-123']);
    server.close();
  });
});

describe('login (MVP-2)', () => {
  // A gate that lets nobody in, as for a user without a Catalog role.
  const forbidden = (_req: express.Request, res: express.Response) => {
    res.status(403).type('application/problem+json').json({ status: 403 });
  };
  const withGate = (gate: express.RequestHandler) =>
    createApp({ backendUrl, clientDist, version, backendTimeoutMs: 1000, auth: { gate } });

  it('gates entry.js and the API, but not the hashed files', async () => {
    const gated = withGate(forbidden);
    expect((await request(gated).get('/mfe/catalog/entry.js')).status).toBe(403);
    expect((await request(gated).head('/mfe/catalog/entry.js?retry=1')).status).toBe(403);
    expect((await request(gated).get('/mfe/catalog/assets/entry-abc123.js')).status).toBe(200);
    expect((await request(gated).get('/api/catalog/test-error')).status).toBe(403);
  });

  it('answers /me from the gate and marks a development bypass', async () => {
    const me = { sub: 'dev', roles: ['r'] };
    const app = createApp({
      backendUrl,
      clientDist,
      version,
      backendTimeoutMs: 1000,
      auth: {
        gate: (_req, res, next) => {
          res.locals.me = me;
          next();
        },
        devBypass: true,
      },
    });
    const res = await request(app).get('/api/catalog/me');
    expect(res.body).toEqual(me);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.headers['x-auth-dev-bypass']).toBe('true');
  });

  it('is off without auth: /me does not exist', async () => {
    expect((await request(app()).get('/api/catalog/me')).status).toBe(404);
  });
});
