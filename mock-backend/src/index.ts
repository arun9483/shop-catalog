import {
  closeOnSignal,
  connectIdp,
  devBypassFromEnv,
  devRequireUser,
  oidcSettingsFromEnv,
  readVersion,
  requireUser,
} from '@shop-catalog/server-common';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 4002);

// Login (MVP-2) is off unless AUTH_ENABLED=true; standalone, the development bypass acts as a fixed user.
const dev = devBypassFromEnv();
const settings = dev ? undefined : oidcSettingsFromEnv();
const loggedIn = dev
  ? devRequireUser(dev)
  : settings && requireUser({ ...connectIdp(settings), unit: 'catalog' });

const server = createApp(readVersion(import.meta.dirname), loggedIn, Boolean(dev)).listen(
  port,
  () => {
    console.log(`catalog mock backend on http://localhost:${port}${loggedIn ? ' (login on)' : ''}`);
  },
);
closeOnSignal(server);
