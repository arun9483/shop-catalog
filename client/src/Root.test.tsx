import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
import { Root } from './Root';
import { match } from './routing';

const products = [
  { id: 'mug', name: 'Stoneware mug', price: 349, description: 'Holds 350 ml.' },
  { id: 'kettle', name: 'Steel kettle', price: 1499, description: 'Boils fast.' },
];

function visit(path: string) {
  act(() => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) => {
      const id = url.split('/').pop();
      if (url === '/api/catalog/products') return Promise.resolve(Response.json(products));
      const product = products.find((p) => p.id === id);
      return Promise.resolve(
        product ? Response.json(product) : new Response(null, { status: 404 }),
      );
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('match', () => {
  it.each([
    ['/catalog', { page: 'list' }],
    ['/catalog/mug', { page: 'detail', id: 'mug' }],
    ['/catalog/test-error', { page: 'test-error' }],
    ['/catalog/a/b', { page: 'not-found' }],
  ])('%s', (path, route) => {
    expect(match(path)).toEqual(route);
  });
});

describe('Root', () => {
  it('lists products and opens one in the page', async () => {
    visit('/catalog');
    render(<Root />);
    fireEvent.click(await screen.findByRole('link', { name: 'Stoneware mug' }));
    // The Shell's single-spa fires popstate after pushState; without it here, fire it by hand.
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(window.location.pathname).toBe('/catalog/mug');
    expect(await screen.findByRole('heading', { name: 'Stoneware mug' })).toBeTruthy();
  });

  it('shows a missing product', async () => {
    visit('/catalog/nope');
    render(<Root />);
    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeTruthy();
  });

  it('shows its fallback for a render error, reports it, and clears it on navigation', async () => {
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    visit('/catalog/test-error?kind=render');
    render(
      <ErrorBoundary>
        <Root />
      </ErrorBoundary>,
    );
    expect(await screen.findByRole('heading', { name: 'Catalog is unavailable' })).toBeTruthy();
    expect(reportError).toHaveBeenCalledWith(new Error('Catalog client test error (render)'));
    visit('/catalog');
    expect(await screen.findByRole('heading', { name: 'Catalog' })).toBeTruthy();
  });
});
