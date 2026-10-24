import express, { type Express } from 'express';
import {
  healthRouter,
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

/** Stand-in for the Catalog backend service. Dev only; never deployed. */
export function createApp(version: VersionInfo): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(healthRouter({ version }));
  app.use(traceResponse);

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
