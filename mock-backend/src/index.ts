import {
  connectIdp,
  devBypassFromEnv,
  devRequireUser,
  oidcSettingsFromEnv,
  requireService,
  requireUser,
} from '@arun-dev/server/auth';
import { closeOnSignal, readVersion } from '@arun-dev/server/http';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 4002);

// Login (MVP-2) is off unless AUTH_ENABLED=true; standalone, the development bypass acts as a fixed user.
const dev = devBypassFromEnv();
const settings = dev ? undefined : oidcSettingsFromEnv();
const idp = settings && connectIdp(settings);
const loggedIn = dev
  ? devRequireUser(dev)
  : idp && requireUser({ ...idp, audience: 'catalog-backend' });
// Other backends reading products (ADR 0005): only with login on, never with the bypass.
const service =
  idp && requireService({ ...idp, audience: 'catalog-backend', role: 'catalog-api:read-products' });

const server = createApp(readVersion(import.meta.dirname), loggedIn, Boolean(dev), service).listen(
  port,
  () => {
    console.log(`catalog mock backend on http://localhost:${port}${loggedIn ? ' (login on)' : ''}`);
  },
);
closeOnSignal(server);
