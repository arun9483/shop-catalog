import { Suspense } from 'react';
import { match, usePathname } from './routing';
import { lazyWithTimeout } from './timeouts';

// Each feature is its own chunk, loaded on first use. The entry imports no feature code and no
// design-system components, so it stays lean.
const ProductList = lazyWithTimeout(() => import('./features/ProductList'));
const ProductDetail = lazyWithTimeout(() => import('./features/ProductDetail'));
const TestError = lazyWithTimeout(() => import('./features/TestError'));

function Page() {
  const route = match(usePathname());
  switch (route.page) {
    case 'list':
      return <ProductList />;
    case 'detail':
      return <ProductDetail id={route.id} />;
    case 'test-error':
      return <TestError />;
    case 'not-found':
      return <h1>Page not found</h1>;
  }
}

export function Root() {
  return (
    <Suspense fallback={<progress aria-label="Loading" />}>
      <Page />
    </Suspense>
  );
}
