import express, { type Express, type RequestHandler } from 'express';
import {
  devBypassHeader,
  healthRouter,
  meHandler,
  HttpError,
  notFound,
  problemHandler,
  traceResponse,
  type VersionInfo,
} from '@shop-catalog/server-common';

const products = [
  {
    id: 'kettle',
    name: 'Steel kettle',
    price: 1499,
    description: 'A 1.5 litre kettle that boils fast.',
  },
  { id: 'mug', name: 'Stoneware mug', price: 349, description: 'Holds 350 ml and keeps tea warm.' },
  {
    id: 'teapot',
    name: 'Glass teapot',
    price: 899,
    description: 'Brew loose leaf tea and watch it.',
  },
];

/**
 * Stand-in for the Catalog backend service. Dev only; never deployed. With `requireUser` (MVP-2,
 * `AUTH_ENABLED=true`, or the development bypass), every route but health and version needs a
 * logged-in user with a Catalog role.
 */
export function createApp(
  version: VersionInfo,
  requireUser?: RequestHandler,
  devBypass = false,
  requireService?: RequestHandler,
): Express {
  const app = express();
  app.disable('x-powered-by');
  if (devBypass) app.use(devBypassHeader);
  app.use(healthRouter({ version }));
  app.use(traceResponse);
  // For other backends only (ADR 0005): names and prices, for a caller Catalog granted
  // catalog-api:read-products. Product data is not the user's, so the user's own Catalog role is
  // not checked; the user it is for (X-Shop-User-Sub) is recorded for tracing only.
  if (requireService) {
    app.get('/service/products', requireService, (req, res) => {
      const query = typeof req.query.ids === 'string' ? req.query.ids : '';
      const ids = new Set(query.split(',').filter(Boolean));
      res.json(
        products
          .filter(({ id }) => ids.has(id))
          .map(({ id, name, price }) => ({ id, name, price })),
      );
    });
  }
  if (requireUser) {
    app.use(requireUser);
    app.get('/me', meHandler);
  }

  app.get('/products', (_req, res) => {
    res.json(products);
  });

  app.get('/products/:id', (req, res) => {
    const product = products.find(({ id }) => id === req.params.id);
    if (!product) throw new HttpError(404, `No product ${req.params.id}`);
    res.json(product);
  });

  app.get('/test-error', () => {
    throw new Error('Catalog mock backend test error');
  });

  app.use(notFound);
  app.use(problemHandler);
  return app;
}
