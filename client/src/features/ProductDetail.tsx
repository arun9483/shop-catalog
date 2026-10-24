import { Heading, Paragraph } from '@arun-dev/ui';
import { useEffect, useState } from 'react';
import { NavLink } from './NavLink';
import { formatPrice, type Product } from './products';

type State = { status: 'loading' } | { status: 'missing' } | { status: 'ready'; product: Product };

export default function ProductDetail({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/catalog/products/${encodeURIComponent(id)}`, { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<Product>) : Promise.reject(new Error())))
      .then((product) => {
        setState({ status: 'ready', product });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'missing' });
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
        <Heading level={1}>{state.status === 'loading' ? 'Loading…' : 'Product not found'}</Heading>
      )}
      <NavLink to="/catalog">Back to the catalog</NavLink>
    </>
  );
}
