import { Heading, Paragraph } from '@arun-dev/ui';
import { useEffect, useState } from 'react';
import { fetchWithTimeout } from '../timeouts';
import { NavLink } from './NavLink';
import { formatPrice, type Product } from './products';

type State =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'failed' }
  | { status: 'ready'; product: Product };

export default function ProductDetail({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchWithTimeout(`/api/catalog/products/${encodeURIComponent(id)}`, controller.signal)
      .then(async (res) => {
        if (res.ok) setState({ status: 'ready', product: (await res.json()) as Product });
        else setState({ status: res.status === 404 ? 'missing' : 'failed' });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' });
      });
    return () => {
      controller.abort();
    };
  }, [id]);

  return (
    <>
      {state.status === 'ready' ? (
        <>
          <Heading level={1}>{state.product.name}</Heading>
          <Paragraph>{formatPrice(state.product.price)}</Paragraph>
          <Paragraph>{state.product.description}</Paragraph>
        </>
      ) : (
        <Heading level={1}>
          {
            {
              loading: 'Loading…',
              missing: 'Product not found',
              failed: 'The product could not be loaded.',
            }[state.status]
          }
        </Heading>
      )}
      <NavLink to="/catalog">Back to the catalog</NavLink>
    </>
  );
}
