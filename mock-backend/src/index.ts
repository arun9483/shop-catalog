import { readVersion } from '@shop-catalog/server-common';
import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 4002);

createApp(readVersion(import.meta.dirname)).listen(port, () => {
  console.log(`catalog mock backend on http://localhost:${port}`);
});
