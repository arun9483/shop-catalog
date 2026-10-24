import { resolve } from 'node:path';
import { readVersion } from '@shop-catalog/server-common';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3002);
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4002';
const clientDist = resolve(process.env.CLIENT_DIST ?? '../client/dist');
const backendTimeoutMs = Number(process.env.BACKEND_TIMEOUT_MS ?? 3000);

createApp({
  backendUrl,
  clientDist,
  version: readVersion(import.meta.dirname),
  backendTimeoutMs,
}).listen(port, () => {
  console.log(`catalog FES on http://localhost:${port}`);
});
