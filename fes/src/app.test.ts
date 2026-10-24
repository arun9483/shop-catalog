import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
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
