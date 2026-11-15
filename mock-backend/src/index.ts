import {
  connectIdp,
  devBypassFromEnv,
  devRequireUser,
  oidcSettingsFromEnv,
  requireService,
  requireUser,
} from '@arun-dev/server/auth';
import { keycloakAdapter } from '@arun-dev/server/auth/keycloak';
import { closeOnSignal, readVersion } from '@arun-dev/server/http';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 4002);

// Login (MVP-2) is off unless AUTH_ENABLED=true; standalone, the development bypass acts as a fixed user.
const dev = devBypassFromEnv();
const settings = dev ? undefined : oidcSettingsFromEnv();
const idp = settings && connectIdp(settings, { keycloak: keycloakAdapter });
// This backend's client at the IdP: its name in a token's aud, and the client its roles are on.
const audience = process.env.OIDC_AUDIENCE ?? 'catalog-backend';
const loggedIn = dev ? devRequireUser(dev) : idp && requireUser({ ...idp, audience });
// Other backends reading products (ADR 0005): only with login on, never with the bypass.
const service = idp && requireService({ ...idp, audience, role: 'catalog-api:read-products' });

const server = createApp(readVersion(import.meta.dirname), loggedIn, Boolean(dev), service).listen(
  port,
  () => {
    console.log(`catalog mock backend on http://localhost:${port}${loggedIn ? ' (login on)' : ''}`);
  },
);
closeOnSignal(server);
