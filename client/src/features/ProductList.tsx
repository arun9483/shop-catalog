import { Heading, Paragraph } from '@arun-dev/ui';
import { useEffect, useState } from 'react';
import styles from './Catalog.module.css';
import { NavLink } from './NavLink';
import { formatPrice, type Product } from './products';

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/catalog/products', { signal: controller.signal })
      .then((res) => (res.ok ? (res.json() as Promise<Product[]>) : Promise.reject(new Error())))
      .then((list) => {
        setProducts(list);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => {
      controller.abort();
    };
  }, []);

  return (
    <>
      <Heading level={1}>Catalog</Heading>
      {failed && <Paragraph>Products could not be loaded.</Paragraph>}
      {!failed && !products && <Paragraph>Loading…</Paragraph>}
      {products && (
        <ul className={styles.list}>
          {products.map((product) => (
            <li key={product.id}>
              <NavLink to={`/catalog/${product.id}`}>{product.name}</NavLink>{' '}
              <span>{formatPrice(product.price)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
