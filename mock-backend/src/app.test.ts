import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app.js';

const app = createApp({ name: 'mock-backend', version: '0.1.0', commit: 'test', buildTime: 'now' });

describe('catalog mock backend', () => {
  it('lists products', async () => {
    const res = await request(app).get('/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.headers.traceresponse).toBeDefined();
  });

  it('serves one product', async () => {
    const res = await request(app).get('/products/mug');
    expect(res.body).toMatchObject({ id: 'mug', name: 'Stoneware mug' });
  });

  it('answers an unknown product with a 404 problem', async () => {
    const res = await request(app).get('/products/nope');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
  });

  it('throws on /test-error as a problem', async () => {
    const res = await request(app).get('/test-error');
    expect(res.status).toBe(500);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
  });

  it('is ready', async () => {
    expect((await request(app).get('/health/ready')).status).toBe(200);
  });
});
